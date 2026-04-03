import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('api', {
    searchDeezer: (query: string, options?: object) =>
        ipcRenderer.invoke('deezer-search', query, options),
    lookupArtist: (name: string, options?: object) =>
        ipcRenderer.invoke('artist-bio-lookup', name, options),
    searchAlbums: (query: string, options?: object) =>
        ipcRenderer.invoke('deezer-search-albums', query, options),
})