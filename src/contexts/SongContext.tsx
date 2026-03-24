
import { createContext, ReactNode, useContext, useState } from "react";

type SongContextType = {}

const SongContext = createContext<SongContextType | null>(null)

export const SongProvider = ({ children }: { children: ReactNode }) => {
    const [value, setValue] = useState('')

    const ctx = {}

    return (
        <SongContext.Provider value={ctx}>
            {children}
        </SongContext.Provider>
    )
}

export const useSongContext = () => {
    const ctx = useContext(SongContext)
    if (!ctx) throw new Error('useSongContext must be used inside SongProvider')
    return ctx
}