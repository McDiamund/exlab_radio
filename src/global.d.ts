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
        }
    }
}