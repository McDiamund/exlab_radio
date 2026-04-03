import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

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

app.whenReady().then(createWindow)

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