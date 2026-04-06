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
    getYoutubeDownloadSetup: () => ipcRenderer.invoke('youtube-download-setup'),
    playlistsGet: () => ipcRenderer.invoke('playlists-get'),
    playlistsAdd: (payload: {
        name: string
        description?: string
        coverDataUrl?: string | null
    }) => ipcRenderer.invoke('playlists-add', payload),
    playlistsAddTrack: (payload: { playlistId: string; track: unknown }) =>
        ipcRenderer.invoke('playlists-add-track', payload),
    playlistsRemoveTrack: (payload: { playlistId: string; trackId: number }) =>
        ipcRenderer.invoke('playlists-remove-track', payload),
    playlistsDelete: (payload: { playlistId: string }) =>
        ipcRenderer.invoke('playlists-delete', payload),
    networkBroadcastStart: (port: number) =>
        ipcRenderer.invoke('network-broadcast-start', port),
    networkBroadcastStop: () => ipcRenderer.invoke('network-broadcast-stop'),
    networkBroadcastStatus: () => ipcRenderer.invoke('network-broadcast-status'),
    networkBroadcastSetNowPlaying: (
        payload: {
            audioFilePath: string
            title: string
            artist: string
            description?: string
            coverUrl?: string | null
        } | null,
    ) => ipcRenderer.invoke('network-broadcast-set-now-playing', payload),
    networkBroadcastScan: (port: number) =>
        ipcRenderer.invoke('network-broadcast-scan', port),
})