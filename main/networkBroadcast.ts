import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

export const EXLAB_BROADCAST_PREFIX = '/exlab-radio'
export const EXLAB_BROADCAST_INFO_PATH = `${EXLAB_BROADCAST_PREFIX}/info`
export const EXLAB_BROADCAST_STREAM_PATH = `${EXLAB_BROADCAST_PREFIX}/stream`
export const EXLAB_BROADCAST_COVER_PATH = `${EXLAB_BROADCAST_PREFIX}/cover`

export type LanBroadcastInfo = {
  app: 'exlab-radio'
  schemaVersion: 1
  title: string
  artist: string
  description: string
  coverUrl: string | null
  streamUrl: string
  contentType: string | null
  contentLength: number | null
  hasAudio: boolean
}

export type LanBroadcastTrackState = {
  filePath: string
  title: string
  artist: string
  description: string
  coverRemoteUrl: string | null
  coverLocalAbsolute: string | null
}

let server: http.Server | null = null
let boundPort = 0
let audioRootResolved = ''
let trackState: LanBroadcastTrackState | null = null

function mimeFromAudioPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.aac': 'audio/aac',
    '.opus': 'audio/opus',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
  }
  return map[ext] ?? 'application/octet-stream'
}

function mimeFromImagePath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }
  return map[ext] ?? 'application/octet-stream'
}

function isPathInsideDir(file: string, dir: string): boolean {
  const resolvedFile = path.resolve(file)
  const resolvedDir = path.resolve(dir)
  const prefix = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep
  return resolvedFile === resolvedDir || resolvedFile.startsWith(prefix)
}

function sendCors(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
}

function currentAudioAbsolute(): string | null {
  const fp = trackState?.filePath
  if (!fp || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) return null
  if (!isPathInsideDir(fp, audioRootResolved)) return null
  return path.resolve(fp)
}

function sendAudioResponse(req: http.IncomingMessage, res: http.ServerResponse): void {
  const absolute = currentAudioAbsolute()
  if (!absolute) {
    sendCors(res)
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('No audio')
    return
  }

  const size = fs.statSync(absolute).size
  const contentType = mimeFromAudioPath(absolute)
  const range = req.headers.range

  if (!range) {
    sendCors(res)
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
      })
      res.end()
      return
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
    })
    const stream = fs.createReadStream(absolute)
    stream.on('error', () => {
      if (!res.writableEnded) res.destroy()
    })
    stream.pipe(res)
    return
  }

  const m = /^bytes=(.+)$/i.exec(range.trim())
  if (!m) {
    sendCors(res)
    res.writeHead(400).end()
    return
  }

  const spec = m[1].trim()
  let start: number
  let end: number

  if (spec.startsWith('-')) {
    const suffix = parseInt(spec.slice(1), 10)
    if (!Number.isFinite(suffix) || suffix <= 0) {
      sendCors(res)
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end()
      return
    }
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    const dash = spec.indexOf('-')
    const startStr = dash >= 0 ? spec.slice(0, dash) : spec
    const endStr = dash >= 0 ? spec.slice(dash + 1) : ''
    start = startStr ? parseInt(startStr, 10) : 0
    end = endStr ? parseInt(endStr, 10) : size - 1
    if (!Number.isFinite(start) || start < 0 || start >= size) {
      sendCors(res)
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end()
      return
    }
    if (!Number.isFinite(end) || end >= size) end = size - 1
    if (end < start) {
      sendCors(res)
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end()
      return
    }
  }

  const chunkSize = end - start + 1
  sendCors(res)
  if (req.method === 'HEAD') {
    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    })
    res.end()
    return
  }

  res.writeHead(206, {
    'Content-Type': contentType,
    'Content-Length': String(chunkSize),
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Accept-Ranges': 'bytes',
  })
  const stream = fs.createReadStream(absolute, { start, end })
  stream.on('error', () => {
    if (!res.writableEnded) res.destroy()
  })
  stream.pipe(res)
}

function handleInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
  const host = req.headers.host ?? `127.0.0.1:${boundPort}`
  const base = `http://${host}`
  const absolute = currentAudioAbsolute()
  const hasAudio = Boolean(absolute)

  let coverUrl: string | null = null
  if (trackState?.coverRemoteUrl) {
    coverUrl = trackState.coverRemoteUrl
  } else if (trackState?.coverLocalAbsolute) {
    const cp = trackState.coverLocalAbsolute
    if (fs.existsSync(cp) && fs.statSync(cp).isFile()) {
      coverUrl = `${base}${EXLAB_BROADCAST_COVER_PATH}`
    }
  }

  const body: LanBroadcastInfo = {
    app: 'exlab-radio',
    schemaVersion: 1,
    title: trackState?.title ?? '',
    artist: trackState?.artist ?? '',
    description: trackState?.description ?? '',
    coverUrl,
    streamUrl: `${base}${EXLAB_BROADCAST_STREAM_PATH}`,
    contentType: absolute ? mimeFromAudioPath(absolute) : null,
    contentLength: absolute ? fs.statSync(absolute).size : null,
    hasAudio,
  }

  sendCors(res)
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function handleCover(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const cp = trackState?.coverLocalAbsolute
  if (!cp || !fs.existsSync(cp) || !fs.statSync(cp).isFile()) {
    sendCors(res)
    res.writeHead(404).end()
    return
  }
  sendCors(res)
  res.writeHead(200, { 'Content-Type': mimeFromImagePath(cp) })
  fs.createReadStream(cp)
    .on('error', () => {
      if (!res.writableEnded) res.destroy()
    })
    .pipe(res)
}

export function setLanBroadcastTrack(state: LanBroadcastTrackState | null): void {
  trackState = state
}

export function getLanBroadcastPort(): number {
  return boundPort
}

export function isLanBroadcastListening(): boolean {
  return Boolean(server && boundPort > 0)
}

export function startLanBroadcastServer(port: number, audioRoot: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) {
      reject(new Error('LAN broadcast is already running'))
      return
    }
    audioRootResolved = path.resolve(audioRoot)

    const s = http.createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        sendCors(res)
        res.writeHead(204).end()
        return
      }

      const raw = req.url?.split('?')[0] ?? ''
      const pathname = raw.endsWith('/') && raw.length > 1 ? raw.slice(0, -1) : raw

      try {
        if (
          (req.method === 'GET' || req.method === 'HEAD') &&
          pathname === EXLAB_BROADCAST_INFO_PATH
        ) {
          handleInfo(req, res)
          return
        }
        if (req.method === 'GET' && pathname === EXLAB_BROADCAST_COVER_PATH) {
          handleCover(req, res)
          return
        }
        if (
          (req.method === 'GET' || req.method === 'HEAD') &&
          pathname === EXLAB_BROADCAST_STREAM_PATH
        ) {
          sendAudioResponse(req, res)
          return
        }
      } catch {
        sendCors(res)
        if (!res.writableEnded) res.writeHead(500).end()
        return
      }

      sendCors(res)
      res.writeHead(404).end()
    })

    s.on('error', (err) => {
      if (!server) reject(err)
    })

    s.listen(port, '0.0.0.0', () => {
      const addr = s.address()
      boundPort = typeof addr === 'object' && addr ? addr.port : port
      server = s
      resolve(boundPort)
    })
  })
}

export function stopLanBroadcastServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      boundPort = 0
      resolve()
      return
    }
    const s = server
    server = null
    boundPort = 0
    s.close(() => resolve())
  })
}

export function getLanIPv4Addresses(): string[] {
  const out: string[] = []
  const nets = os.networkInterfaces()
  for (const key of Object.keys(nets)) {
    for (const net of nets[key] ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address)
    }
  }
  return out
}

function subnetPrefixForIp(ip: string): string | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export async function scanLanForExlabBroadcasts(
  port: number,
): Promise<Array<{ address: string; info: LanBroadcastInfo }>> {
  const myIps = new Set(getLanIPv4Addresses())
  const prefixes = new Set<string>()
  for (const ip of myIps) {
    const p = subnetPrefixForIp(ip)
    if (p) prefixes.add(p)
  }

  const candidates: string[] = []
  for (const prefix of prefixes) {
    for (let h = 1; h <= 254; h++) {
      const ip = `${prefix}.${h}`
      if (myIps.has(ip)) continue
      candidates.push(ip)
    }
  }

  const results: Array<{ address: string; info: LanBroadcastInfo }> = []
  const batchSize = 40

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const chunk = await Promise.all(
      batch.map(async (address) => {
        const url = `http://${address}:${port}${EXLAB_BROADCAST_INFO_PATH}`
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 500)
        try {
          const r = await fetch(url, { signal: c.signal })
          clearTimeout(t)
          if (!r.ok) return null
          const json = (await r.json()) as Partial<LanBroadcastInfo>
          if (json.app !== 'exlab-radio' || json.schemaVersion !== 1) return null
          return { address, info: json as LanBroadcastInfo }
        } catch {
          clearTimeout(t)
          return null
        }
      }),
    )
    for (const row of chunk) {
      if (row) results.push(row)
    }
  }

  return results
}
