// global.d.ts
export {}
declare global {
    interface Window {
        api: {
            searchDeezer: (query: string, options?: object) => Promise<any>
            lookupArtist: (name: string, options?: object) => Promise<any>
            searchAlbums: (query: string, options?: object) => Promise<any>
            getDeezerAlbumTracklist: (albumId: string | number) => Promise<any>
            fetchImageDataUrl: (url: string) => Promise<string>
            downloadYoutubeAudio: (
                title: string,
                artist: string,
            ) => Promise<{ filePath: string; fileUrl: string; query: string }>
            getYoutubeDownloadSetup: () => Promise<{
                platform: string
                ytDlp: {
                    source:
                        | 'env_override'
                        | 'system_path'
                        | 'bundled_cache'
                        | 'bundled_will_download'
                    path: string | null
                }
                ffmpeg: { available: boolean; path: string | null }
                aria2c: { available: boolean; path: string | null }
                installCoreCommand: string
                installOptionalCommand: string
            }>
            playlistsGet: () => Promise<
                Array<{
                    id: string
                    name: string
                    description: string
                    createdAt: string
                    coverUrl: string | null
                    tracks: unknown[]
                }>
            >
            playlistsAdd: (payload: {
                name: string
                description?: string
                coverDataUrl?: string | null
            }) => Promise<{
                id: string
                name: string
                description: string
                createdAt: string
                coverUrl: string | null
                tracks: unknown[]
            }>
            playlistsAddTrack: (payload: {
                playlistId: string
                track: unknown
            }) => Promise<{ ok: true; duplicate: boolean }>
            playlistsRemoveTrack: (payload: {
                playlistId: string
                trackId: number
            }) => Promise<{ ok: true; removed: boolean }>
            playlistsDelete: (payload: {
                playlistId: string
            }) => Promise<{ ok: true }>
            networkBroadcastStart: (port: number) => Promise<
                | { ok: true; port: number; lanBaseUrls: string[] }
                | { ok: false; error: string }
            >
            networkBroadcastStop: () => Promise<{ ok: true }>
            networkBroadcastStatus: () => Promise<{
                listening: boolean
                port: number
                addresses: string[]
            }>
            networkBroadcastSetNowPlaying: (
                payload: {
                    audioFilePath: string
                    title: string
                    artist: string
                    description?: string
                    coverUrl?: string | null
                } | null,
            ) => Promise<{ ok: true }>
            networkBroadcastScan: (port: number) => Promise<{
                ok: true
                streams: Array<{
                    address: string
                    info: {
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
                }>
            }>
        }
    }
}