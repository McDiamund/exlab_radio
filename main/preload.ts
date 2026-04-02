import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('api', {
    searchDeezer: (query: string, options?: object) =>
        ipcRenderer.invoke('deezer-search', query, options),
})