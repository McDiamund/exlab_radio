import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('api', {
    searchDeezer: (query: string, options?: object) =>
        ipcRenderer.invoke('deezer-search', query, options),
    lookupArtist: (name: string, options?: object) =>
        ipcRenderer.invoke('artist-bio-lookup', name, options),
    searchAlbums: (query: string, options?: object) =>
        ipcRenderer.invoke('deezer-search-albums', query, options),
    getDeezerAlbumTracklist: (albumId: string | number) =>
        ipcRenderer.invoke('deezer-album-tracklist', albumId),
    fetchImageDataUrl: (url: string) => ipcRenderer.invoke('fetch-image-data-url', url),
    downloadYoutubeAudio: (title: string, artist: string) =>
        ipcRenderer.invoke('youtube-dl-download-audio', title, artist),
})