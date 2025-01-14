import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'



const express = require('express')
const cors = require('cors');

const yts = require('yt-search')
const fs = require('fs');
const ytdl = require('ytdl-core');

// Express app setup
const expressApp = express()
const port = 3000
let server

expressApp.use(express.json())
expressApp.use(cors());

// Route definitions
const defineRoutes = (app) => {

  app.post('/search', async (req, res) => {
    try {
      const body = req.body;
      console.log('Received data:', body);

      // Search Song on Youtube
      const r = await yts(`${body.name} ${body.artist}`)
      console.log(r.videos[0].url)

      res.json({
        url: r.videos[0].url
      });

    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred');
    }
  });

  app.get('/audio', async (req, res) => {
    const videoURL = req.query.url;
    if (!ytdl.validateURL(videoURL)) {
      console.log('Invalid URL');
      return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
      // Get video info
      const info = await ytdl.getInfo(videoURL);

      // Choose an audio format
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

      if (!audioFormat) {
        console.log('No audio format found');
        return res.status(500).send('No suitable audio format found.');
      }

      console.log('Selected audio format:', audioFormat.mimeType); // Log format for debugging

      // Set the correct headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${info.videoDetails.title}.mp3"`);

      // Stream the audio
      const audioStream = ytdl(videoURL, { format: audioFormat });
      audioStream.pipe(res);

      // Catch stream errors
      audioStream.on('error', (err) => {
        console.error('Error during streaming:', err);
        res.status(500).send('Error streaming audio.');
      });

    } catch (error) {
      console.error('Failed to stream audio:', error);
      res.status(500).json({ error: 'Failed to stream audio' });
    }
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });

}

defineRoutes(expressApp)

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  server = expressApp.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}`)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  server.close()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
