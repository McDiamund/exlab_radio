import React, { createContext, ReactNode, useContext, useState } from "react";


export interface DeezerArtist {
  id: number;
  name: string;
  link: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  cover: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  cover_xl: string;
}

export interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  duration: number;           // in seconds
  rank: number;               // popularity score
  preview: string;            // 30-second MP3 preview URL
  link: string;               // full Deezer URL to the track
  explicit_lyrics: boolean;
  artist: DeezerArtist;
  album: DeezerAlbum;
}
export interface DeezerSearchOptions {
  limit?: number;             // number of results (default: 25, max: 100)
  index?: number;             // pagination offset
  order?: DeezerSearchOrder;
}

export type DeezerSearchOrder =
  | "RANKING"
  | "TRACK_ASC"
  | "TRACK_DESC"
  | "ARTIST_ASC"
  | "ARTIST_DESC"
  | "ALBUM_ASC"
  | "ALBUM_DESC"
  | "RATING_ASC"
  | "RATING_DESC"
  | "DURATION_ASC"
  | "DURATION_DESC";

export interface DeezerSearchResult {
    tracks: DeezerTrack[];
    total: number;
    nextIndex: number | null;
}

type SongContextType = {
    searchDeezer: (query: string, options?: DeezerSearchOptions) => Promise<DeezerSearchResult>
}

const SongContext = createContext<SongContextType | null>(null)

export const SongProvider = ({ children }: { children: ReactNode }) => {
    
    async function searchDeezer(
        query: string,
        options: DeezerSearchOptions = {}
    ): Promise<DeezerSearchResult> {
        const json = await window.api.searchDeezer(query, options)

        if (json.error) throw new Error(`Deezer API error: ${json.error.message}`)

        return {
            tracks: json.data,
            total: json.total,
            nextIndex: json.next ? (options.index ?? 0) + (options.limit ?? 25) : null,
        }
    }

    const ctx = {
        searchDeezer
    }

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