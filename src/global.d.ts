// global.d.ts
export {}
declare global {
    interface Window {
        api: {
            searchDeezer: (query: string, options?: object) => Promise<any>
        }
    }
}