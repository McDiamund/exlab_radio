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