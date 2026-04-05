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
        }
    }
}