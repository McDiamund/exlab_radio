import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
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
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('deezer-search', async (_event, query: string, options = {}) => {
  const { limit = 25, index = 0, order = 'RANKING'} = options

  const params = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 100).toString(),
    index: index.toString,
    order
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

ipcMain.handle('fetch-image-data-url', async (_event, url: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
})

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
