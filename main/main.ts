import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import youtubedl, { create as createYoutubeDl } from 'youtube-dl-exec'

const APP_AUDIO_SCHEME = 'app-audio'

/** Must run before app ready — allows <audio> / fetch from this origin alongside http://localhost. */
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

    const fileHref = pathToFileURL(absolute).href
    return net.fetch(fileHref)
  })
}

function getYoutubeDl() {
  const override = process.env.EXLAB_YT_DLP?.trim()
  return override ? createYoutubeDl(override) : youtubedl
}

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

/**
 * Searches YouTube for "artist - title" (classroom / educational use only),
 * downloads the best match as audio via youtube-dl-exec (bundled yt-dlp), and returns a local file URL for playback.
 * Uses best native audio (no forced m4a transcode) so ffmpeg often isn’t needed; merge edge cases may still invoke it.
 * Override binary with EXLAB_YT_DLP or youtube-dl-exec env vars (see its readme).
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

    const jobId = randomUUID()
    const outputTemplate = path.join(outDir, `${jobId}.%(ext)s`)
    const ytdl = getYoutubeDl()

    const spawnOpts = {
      timeout: 15 * 60 * 1000,
      windowsHide: true,
    }

    try {
      await ytdl(
        `ytsearch1:${query}`,
        {
          noPlaylist: true,
          /** Faster than extractAudio+m4a: download best audio stream as-is (webm/m4a). */
          format: 'bestaudio/best',
          output: outputTemplate,
          noProgress: true,
          noWarnings: true,
          noPart: true,
        },
        spawnOpts,
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
      /** Use this in the renderer (<audio src>). Raw file:// is blocked from http origins. */
      fileUrl: toAppAudioUrl(filePath),
      query,
    }
  },
)