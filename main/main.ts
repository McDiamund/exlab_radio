import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import {
  getLanIPv4Addresses,
  getLanBroadcastPort,
  isLanBroadcastListening,
  scanLanForExlabBroadcasts,
  setLanBroadcastPlaybackSnapshot,
  setLanBroadcastTrack,
  startLanBroadcastServer,
  stopLanBroadcastServer,
} from './networkBroadcast'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** GUI-launched apps on macOS often miss Homebrew paths; yt-dlp/ffmpeg live there. */
function augmentedPath(): string {
  const base = process.env.PATH ?? ''
  if (process.platform !== 'darwin') return base
  const extra = ['/opt/homebrew/bin', '/usr/local/bin'].filter((dir) => fs.existsSync(dir))
  return extra.length ? `${extra.join(path.delimiter)}${path.delimiter}${base}` : base
}

function childEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: augmentedPath() }
}

async function resolveOnPath(executable: string): Promise<string | null> {
  const cmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const { stdout } = await execFileAsync(cmd, [executable], {
      timeout: 8000,
      windowsHide: true,
      env: childEnv(),
    })
    const first = stdout.trim().split(/\r?\n/).find((line) => line.trim())?.trim()
    return first || null
  } catch {
    return null
  }
}

function installCommandsForPlatform(): { core: string; optional: string } {
  switch (process.platform) {
    case 'darwin':
      return {
        core: 'brew install yt-dlp ffmpeg',
        optional: 'brew install aria2',
      }
    case 'win32':
      return {
        core: 'winget install -e --id yt-dlp.yt-dlp && winget install -e --id Gyan.FFmpeg',
        optional: 'winget install -e --id aria2.aria2',
      }
    default:
      return {
        core: 'sudo apt update && sudo apt install -y yt-dlp ffmpeg',
        optional: 'sudo apt install -y aria2',
      }
  }
}

function buildYtDlpDownloadArgs(
  query: string,
  outputTemplate: string,
  useAria2: boolean,
): string[] {
  const args: string[] = [
    `ytsearch1:${query}`,
    '--no-playlist',
    '-f', 'bestaudio/best',
    '--concurrent-fragments', '8',
  ]
  if (useAria2) {
    args.push(
      '--external-downloader', 'aria2c',
      '--external-downloader-args', 'aria2c:-x 8 -s 8 -k 1M',
    )
  }
  args.push(
    '-o', outputTemplate,
    '--no-progress',
    '--no-warnings',
    '--no-part',
  )
  return args
}

const APP_AUDIO_SCHEME = 'app-audio'
const APP_PLAYLIST_COVER_SCHEME = 'app-playlist-cover'

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_AUDIO_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
  {
    scheme: APP_PLAYLIST_COVER_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])

function audioDownloadsDir(): string {
  return path.join(app.getPath('userData'), 'audio-downloads')
}

function toAppAudioUrl(filePath: string): string {
  const name = path.basename(filePath)
  return `${APP_AUDIO_SCHEME}://file/${encodeURIComponent(name)}`
}

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

/**
 * Serve local audio with Range support. Without 206 partial responses, Chromium
 * cannot seek (<audio>.currentTime), so the UI scrubber appears broken.
 */
function registerAppAudioProtocol(): void {
  const root = path.resolve(audioDownloadsDir())

  protocol.handle(APP_AUDIO_SCHEME, async (request) => {
    let base: string
    try {
      const u = new URL(request.url)
      base = decodeURIComponent(path.basename(u.pathname))
    } catch {
      return new Response(null, { status: 400 })
    }
    if (!base || base === '.' || base === '..') {
      return new Response(null, { status: 400 })
    }

    const absolute = path.resolve(path.join(root, base))
    if (!absolute.startsWith(root + path.sep)) {
      return new Response(null, { status: 403 })
    }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return new Response(null, { status: 404 })
    }

    const size = fs.statSync(absolute).size
    const contentType = mimeFromAudioPath(absolute)
    const range = request.headers.get('range')

    if (!range) {
      const stream = fs.createReadStream(absolute)
      const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes',
        },
      })
    }

    const m = /^bytes=(.+)$/i.exec(range.trim())
    if (!m) {
      return new Response(null, { status: 400 })
    }

    const spec = m[1].trim()
    let start: number
    let end: number

    if (spec.startsWith('-')) {
      const suffix = parseInt(spec.slice(1), 10)
      if (!Number.isFinite(suffix) || suffix <= 0) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
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
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
      }
      if (!Number.isFinite(end) || end >= size) end = size - 1
      if (end < start) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
      }
    }

    const chunkSize = end - start + 1
    const stream = fs.createReadStream(absolute, { start, end })
    const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>

    return new Response(body, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
      },
    })
  })
}

function playlistCoversDir(): string {
  return path.join(app.getPath('userData'), 'playlist-covers')
}

function playlistsStorePath(): string {
  return path.join(app.getPath('userData'), 'playlists.json')
}

const MAX_LOCAL_PLAYLISTS = 8

/** Deezer-shaped track JSON persisted inside a playlist (renderer sends full search/tracklist objects). */
type StoredPlaylistTrack = Record<string, unknown> & { id: number }

type StoredPlaylist = {
  id: string
  name: string
  description: string
  coverFileName: string | null
  createdAt: string
  tracks: StoredPlaylistTrack[]
}

function isStoredTrackRow(row: unknown): row is StoredPlaylistTrack {
  return (
    Boolean(row) &&
    typeof row === 'object' &&
    typeof (row as StoredPlaylistTrack).id === 'number'
  )
}

function readPlaylistsFromDisk(): StoredPlaylist[] {
  const p = playlistsStorePath()
  try {
    if (!fs.existsSync(p)) return []
    const raw = fs.readFileSync(p, 'utf-8')
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    const out: StoredPlaylist[] = []
    for (const row of data) {
      if (!row || typeof row !== 'object') continue
      const r = row as Partial<StoredPlaylist>
      if (typeof r.id !== 'string' || typeof r.name !== 'string') continue
      const rawTracks = r.tracks
      const tracks = Array.isArray(rawTracks)
        ? rawTracks.filter(isStoredTrackRow)
        : []
      out.push({
        id: r.id,
        name: r.name,
        description: typeof r.description === 'string' ? r.description : '',
        coverFileName: typeof r.coverFileName === 'string' ? r.coverFileName : null,
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
        tracks,
      })
    }
    return out
  } catch {
    return []
  }
}

function writePlaylistsToDisk(list: StoredPlaylist[]): void {
  fs.mkdirSync(path.dirname(playlistsStorePath()), { recursive: true })
  fs.writeFileSync(playlistsStorePath(), JSON.stringify(list, null, 2), 'utf-8')
}

function coverUrlForFileName(fileName: string | null): string | null {
  if (!fileName) return null
  return `${APP_PLAYLIST_COVER_SCHEME}://file/${encodeURIComponent(fileName)}`
}

function resolveBroadcastCoverUrls(
  coverUrl: string | null | undefined,
): { coverRemoteUrl: string | null; coverLocalAbsolute: string | null } {
  const c = coverUrl?.trim()
  if (!c) return { coverRemoteUrl: null, coverLocalAbsolute: null }
  if (/^https?:\/\//i.test(c)) {
    return { coverRemoteUrl: c, coverLocalAbsolute: null }
  }
  if (c.startsWith(`${APP_PLAYLIST_COVER_SCHEME}://`)) {
    try {
      const u = new URL(c)
      const base = decodeURIComponent(path.basename(u.pathname))
      if (!base || base === '.' || base === '..') {
        return { coverRemoteUrl: null, coverLocalAbsolute: null }
      }
      const dir = path.resolve(playlistCoversDir())
      const absolute = path.resolve(path.join(dir, path.basename(base)))
      if (!absolute.startsWith(dir + path.sep)) {
        return { coverRemoteUrl: null, coverLocalAbsolute: null }
      }
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
        return { coverRemoteUrl: null, coverLocalAbsolute: absolute }
      }
    } catch {
      // ignore invalid cover URL
    }
  }
  return { coverRemoteUrl: null, coverLocalAbsolute: null }
}

function deletePlaylistCoverFile(coverFileName: string | null): void {
  if (!coverFileName) return
  const dir = path.resolve(playlistCoversDir())
  const base = path.basename(coverFileName)
  const absolute = path.resolve(path.join(dir, base))
  if (!absolute.startsWith(dir + path.sep)) return
  try {
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      fs.unlinkSync(absolute)
    }
  } catch {
    // ignore
  }
}

/**
 * Serves playlist cover images from userData/playlist-covers (local cache).
 */
function registerAppPlaylistCoverProtocol(): void {
  const root = path.resolve(playlistCoversDir())

  protocol.handle(APP_PLAYLIST_COVER_SCHEME, async (request) => {
    let base: string
    try {
      const u = new URL(request.url)
      base = decodeURIComponent(path.basename(u.pathname))
    } catch {
      return new Response(null, { status: 400 })
    }
    if (!base || base === '.' || base === '..') {
      return new Response(null, { status: 400 })
    }

    const absolute = path.resolve(path.join(root, base))
    if (!absolute.startsWith(root + path.sep)) {
      return new Response(null, { status: 403 })
    }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return new Response(null, { status: 404 })
    }

    const buffer = fs.readFileSync(absolute)
    const ext = path.extname(absolute).toLowerCase()
    const mime: Record<string, string> = {
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    }
    const contentType = mime[ext] ?? 'application/octet-stream'
    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': contentType },
    })
  })
}

// ---------------------------------------------------------------------------
// yt-dlp binary management — auto-downloads from GitHub on first use
// ---------------------------------------------------------------------------

const YT_DLP_RELEASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download'

function ytDlpBinaryUrl(): string {
  switch (process.platform) {
    case 'win32':  return `${YT_DLP_RELEASE}/yt-dlp.exe`
    case 'darwin': return `${YT_DLP_RELEASE}/yt-dlp_macos`
    default:       return `${YT_DLP_RELEASE}/yt-dlp_linux`
  }
}

function ytDlpLocalPath(): string {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return path.join(app.getPath('userData'), name)
}

let bundledYtDlpReady: Promise<string> | null = null

/**
 * Downloads the official yt-dlp release into userData if missing (fallback when
 * no system `yt-dlp` is on PATH and EXLAB_YT_DLP is unset).
 */
function ensureBundledYtDlp(): Promise<string> {
  if (!bundledYtDlpReady) {
    bundledYtDlpReady = (async () => {
      const binPath = ytDlpLocalPath()
      if (fs.existsSync(binPath)) return binPath

      console.log('[yt-dlp] Downloading bundled binary for first-time use...')
      const url = ytDlpBinaryUrl()
      const res = await net.fetch(url)
      if (!res.ok) {
        throw new Error(`Failed to download yt-dlp: HTTP ${res.status} from ${url}`)
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      fs.mkdirSync(path.dirname(binPath), { recursive: true })
      fs.writeFileSync(binPath, buffer)

      if (process.platform !== 'win32') {
        fs.chmodSync(binPath, 0o755)
      }

      console.log(`[yt-dlp] Saved to ${binPath}`)
      return binPath
    })()

    bundledYtDlpReady.catch(() => { bundledYtDlpReady = null })
  }

  return bundledYtDlpReady
}

/**
 * Prefers EXLAB_YT_DLP, then `yt-dlp` on PATH (with macOS Homebrew PATH fix),
 * then the bundled auto-downloaded binary.
 */
async function resolveYtDlpForRun(): Promise<string> {
  const override = process.env.EXLAB_YT_DLP?.trim()
  if (override) return override
  const system = await resolveOnPath('yt-dlp')
  if (system) return system
  return ensureBundledYtDlp()
}

// ---------------------------------------------------------------------------

function findOutputFile(outDir: string, jobId: string): string | undefined {
  const entries = fs.readdirSync(outDir)
  const name = entries.find((f) => f.startsWith(`${jobId}.`))
  return name ? path.join(outDir, name) : undefined
}

/** Removes other files in the same folder so only the latest download remains. */
function deleteOtherAudioFilesInDir(dir: string, keepPath: string): void {
  const keepName = path.basename(keepPath)
  let entries: string[]
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (name === keepName) continue
    const full = path.join(dir, name)
    try {
      const st = fs.statSync(full)
      if (st.isFile()) fs.unlinkSync(full)
    } catch {
      // ignore individual failures (e.g. race with another process)
    }
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../index.html'))
  }
}

app.whenReady().then(() => {
  registerAppAudioProtocol()
  registerAppPlaylistCoverProtocol()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void stopLanBroadcastServer()
})

ipcMain.handle('deezer-search', async (_event, query: string, options = {}) => {
  const { limit = 25, index = 0, order = 'RANKING'} = options

  const params = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 100).toString(),
    index: index.toString(),
    order,
  })

  const response = await fetch(`https://api.deezer.com/search?${params}`, {
    headers: { Accept: 'application/json' },
  })

  const json = await response.json()
  return json
})

ipcMain.handle('artist-bio-lookup', async (_event, name: string) => {
    const response = await fetch(
        `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`
    )
    const json = await response.json()
    const artist = json.artists?.[0]

    return {
        bio: artist?.strBiography,        // English biography
        genre: artist?.strGenre,
        country: artist?.strCountry,
        thumbnail: artist?.strArtistThumb,
    }
})

// In main.ts
ipcMain.handle('deezer-search-albums', async (_event, query: string) => {
    const params = new URLSearchParams({
        q: query,
        limit: '25',
        index: '0',
    })
    const response = await fetch(`https://api.deezer.com/search/album?${params}`)
    const json = await response.json()
    return json
})

/** Fetches album metadata, then the track list from the album's `tracklist` API URL. */
ipcMain.handle('deezer-album-tracklist', async (_event, albumId: string | number) => {
    const id = String(albumId).trim()
    const albumRes = await fetch(
        `https://api.deezer.com/album/${encodeURIComponent(id)}`,
        { headers: { Accept: 'application/json' } },
    )
    if (!albumRes.ok) {
        throw new Error(`Deezer album fetch failed: ${albumRes.status}`)
    }
    const album = (await albumRes.json()) as { tracklist?: string; error?: unknown }
    if (album.error) {
        throw new Error('Deezer album response contained an error')
    }
    const tracklistUrl = album.tracklist
    if (!tracklistUrl || typeof tracklistUrl !== 'string') {
        throw new Error('Deezer album has no tracklist URL')
    }
    const tracksRes = await fetch(tracklistUrl, {
        headers: { Accept: 'application/json' },
    })
    if (!tracksRes.ok) {
        throw new Error(`Deezer tracklist fetch failed: ${tracksRes.status}`)
    }
    return tracksRes.json()
})

ipcMain.handle('network-broadcast-start', async (_event, port: number) => {
  const p = Number(port)
  if (!Number.isFinite(p) || p < 1024 || p > 65535) {
    return { ok: false as const, error: 'Port must be between 1024 and 65535' }
  }
  try {
    const actual = await startLanBroadcastServer(p, audioDownloadsDir())
    const ips = getLanIPv4Addresses()
    return {
      ok: true as const,
      port: actual,
      lanBaseUrls: ips.map((ip) => `http://${ip}:${actual}`),
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: msg }
  }
})

ipcMain.handle('network-broadcast-stop', async () => {
  await stopLanBroadcastServer()
  return { ok: true as const }
})

ipcMain.handle('network-broadcast-status', async () => ({
  listening: isLanBroadcastListening(),
  port: getLanBroadcastPort(),
  addresses: getLanIPv4Addresses(),
}))

ipcMain.handle('network-broadcast-set-now-playing', async (_event, payload: unknown) => {
  if (payload === null) {
    setLanBroadcastTrack(null)
    return { ok: true as const }
  }
  const o = payload as Record<string, unknown>
  const filePath = String(o?.audioFilePath ?? '').trim()
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    setLanBroadcastTrack(null)
    return { ok: true as const }
  }
  const root = path.resolve(audioDownloadsDir())
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error('Audio file is outside the downloads folder')
  }
  const title = String(o?.title ?? '').trim()
  const artist = String(o?.artist ?? '').trim()
  const description = String(o?.description ?? '').trim()
  const rawCover = o?.coverUrl
  const coverUrl =
    typeof rawCover === 'string' ? rawCover : rawCover === null ? null : undefined
  const { coverRemoteUrl, coverLocalAbsolute } = resolveBroadcastCoverUrls(coverUrl)
  setLanBroadcastTrack({
    filePath: resolved,
    title,
    artist,
    description,
    coverRemoteUrl,
    coverLocalAbsolute,
  })
  return { ok: true as const }
})

ipcMain.handle('network-broadcast-set-playback-state', async (_event, payload: unknown) => {
  const o = payload as Record<string, unknown>
  const rawPos = o?.positionSec
  const positionSec = typeof rawPos === 'number' ? rawPos : Number(rawPos)
  if (!Number.isFinite(positionSec)) return { ok: true as const }
  const playing = Boolean(o?.playing)
  setLanBroadcastPlaybackSnapshot(positionSec, playing)
  return { ok: true as const }
})

ipcMain.handle('network-broadcast-scan', async (_event, port: number) => {
  const p = Number(port)
  if (!Number.isFinite(p) || p < 1 || p > 65535) {
    throw new Error('Invalid port')
  }
  const streams = await scanLanForExlabBroadcasts(p)
  return { ok: true as const, streams }
})

ipcMain.handle('fetch-image-data-url', async (_event, url: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
})

ipcMain.handle('playlists-get', async () => {
  const list = readPlaylistsFromDisk()
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    description: typeof p.description === 'string' ? p.description : '',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : '',
    coverUrl: coverUrlForFileName(
      typeof p.coverFileName === 'string' ? p.coverFileName : null,
    ),
    tracks: p.tracks,
  }))
})

ipcMain.handle(
  'playlists-add',
  async (
    _event,
    payload: {
      name: string
      description?: string
      coverDataUrl?: string | null
    },
  ) => {
    const name = String(payload?.name ?? '').trim()
    if (!name) throw new Error('Playlist name is required')
    const description = String(payload?.description ?? '').trim()

    const id = randomUUID()
    let coverFileName: string | null = null

    const dataUrl = payload?.coverDataUrl?.trim()
    if (dataUrl?.startsWith('data:')) {
      const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
      if (m) {
        try {
          const mime = m[1].split(';')[0].trim().toLowerCase()
          const buf = Buffer.from(m[2], 'base64')
          if (buf.length === 0) throw new Error('empty image')
          const ext =
            mime === 'image/png'
              ? '.png'
              : mime === 'image/webp'
                ? '.webp'
                : mime === 'image/gif'
                  ? '.gif'
                  : '.jpg'
          const dir = playlistCoversDir()
          fs.mkdirSync(dir, { recursive: true })
          coverFileName = `${id}${ext}`
          fs.writeFileSync(path.join(dir, coverFileName), buf)
        } catch {
          coverFileName = null
        }
      }
    }

    const list = readPlaylistsFromDisk()
    if (list.length >= MAX_LOCAL_PLAYLISTS) {
      throw new Error(`You can have at most ${MAX_LOCAL_PLAYLISTS} playlists`)
    }

    const entry: StoredPlaylist = {
      id,
      name,
      description,
      coverFileName,
      createdAt: new Date().toISOString(),
      tracks: [],
    }
    list.unshift(entry)
    writePlaylistsToDisk(list)

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      createdAt: entry.createdAt,
      coverUrl: coverUrlForFileName(coverFileName),
      tracks: [],
    }
  },
)

ipcMain.handle(
  'playlists-add-track',
  async (_event, payload: { playlistId: string; track: unknown }) => {
    const playlistId = String(payload?.playlistId ?? '').trim()
    if (!playlistId) throw new Error('Playlist id is required')

    const track = payload?.track
    if (!track || typeof track !== 'object') {
      throw new Error('Invalid track')
    }
    const rec = track as Record<string, unknown>
    if (typeof rec.id !== 'number') {
      throw new Error('Track must include a numeric Deezer id')
    }

    const list = readPlaylistsFromDisk()
    const idx = list.findIndex((p) => p.id === playlistId)
    if (idx < 0) throw new Error('Playlist not found')

    const playlist = list[idx]
    const tid = rec.id as number
    if (playlist.tracks.some((t) => t.id === tid)) {
      return { ok: true as const, duplicate: true as const }
    }

    const nextTracks = [...playlist.tracks, track as StoredPlaylistTrack]
    list[idx] = { ...playlist, tracks: nextTracks }
    writePlaylistsToDisk(list)
    return { ok: true as const, duplicate: false as const }
  },
)

ipcMain.handle(
  'playlists-remove-track',
  async (_event, payload: { playlistId: string; trackId: number }) => {
    const playlistId = String(payload?.playlistId ?? '').trim()
    const trackId = Number(payload?.trackId)
    if (!playlistId || !Number.isFinite(trackId)) {
      throw new Error('Playlist id and numeric track id are required')
    }

    const list = readPlaylistsFromDisk()
    const idx = list.findIndex((p) => p.id === playlistId)
    if (idx < 0) throw new Error('Playlist not found')

    const playlist = list[idx]
    const nextTracks = playlist.tracks.filter((t) => t.id !== trackId)
    if (nextTracks.length === playlist.tracks.length) {
      return { ok: true as const, removed: false as const }
    }

    list[idx] = { ...playlist, tracks: nextTracks }
    writePlaylistsToDisk(list)
    return { ok: true as const, removed: true as const }
  },
)

ipcMain.handle(
  'playlists-delete',
  async (_event, payload: { playlistId: string }) => {
    const id = String(payload?.playlistId ?? '').trim()
    if (!id) throw new Error('Playlist id is required')

    const list = readPlaylistsFromDisk()
    const idx = list.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Playlist not found')

    const [removed] = list.splice(idx, 1)
    deletePlaylistCoverFile(removed.coverFileName)
    writePlaylistsToDisk(list)
    return { ok: true as const }
  },
)

ipcMain.handle('youtube-download-setup', async () => {
  const override = process.env.EXLAB_YT_DLP?.trim()
  const bundledPath = ytDlpLocalPath()
  let ytDlp: {
    source: 'env_override' | 'system_path' | 'bundled_cache' | 'bundled_will_download'
    path: string | null
  }
  if (override) {
    ytDlp = { source: 'env_override', path: override }
  } else {
    const systemPath = await resolveOnPath('yt-dlp')
    if (systemPath) {
      ytDlp = { source: 'system_path', path: systemPath }
    } else if (fs.existsSync(bundledPath)) {
      ytDlp = { source: 'bundled_cache', path: bundledPath }
    } else {
      ytDlp = { source: 'bundled_will_download', path: null }
    }
  }
  const ffmpegPath = await resolveOnPath('ffmpeg')
  const ariaPath = await resolveOnPath('aria2c')
  const { core, optional } = installCommandsForPlatform()
  return {
    platform: process.platform,
    ytDlp,
    ffmpeg: { available: Boolean(ffmpegPath), path: ffmpegPath },
    aria2c: { available: Boolean(ariaPath), path: ariaPath },
    installCoreCommand: core,
    installOptionalCommand: optional,
  }
})

/**
 * Searches YouTube for "artist - title" (classroom / educational use only),
 * downloads best audio via yt-dlp (system install preferred; bundled fallback),
 * and returns a local file URL for playback.
 */
ipcMain.handle(
  'youtube-dl-download-audio',
  async (_event, title: string, artist: string) => {
    const t = String(title ?? '').trim()
    const a = String(artist ?? '').trim()
    if (!t && !a) {
      throw new Error('Title and artist cannot both be empty')
    }
    const query = a && t ? `${a} - ${t}` : a || t

    const outDir = path.join(app.getPath('userData'), 'audio-downloads')
    fs.mkdirSync(outDir, { recursive: true })

    const bin = await resolveYtDlpForRun()
    const aria2Path = await resolveOnPath('aria2c')
    const useAria2 = Boolean(aria2Path)

    const jobId = randomUUID()
    const outputTemplate = path.join(outDir, `${jobId}.%(ext)s`)

    try {
      await execFileAsync(
        bin,
        buildYtDlpDownloadArgs(query, outputTemplate, useAria2),
        {
          timeout: 15 * 60 * 1000,
          windowsHide: true,
          env: childEnv(),
        },
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Download failed: ${msg}`)
    }

    const filePath = findOutputFile(outDir, jobId)
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Download reported success but the audio file was not found')
    }

    deleteOtherAudioFilesInDir(outDir, filePath)

    return {
      filePath,
      fileUrl: toAppAudioUrl(filePath),
      query,
    }
  },
)
