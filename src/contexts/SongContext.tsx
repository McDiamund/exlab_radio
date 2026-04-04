import React, { createContext, ReactNode, useContext } from "react";


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
  artist: DeezerArtist
}

export interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  duration: number;           // in seconds
  rank: number;               // popularity score
    preview: string;            // 30-second MP3 preview URL (unused for playback; search metadata only)
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

export interface DeezerAlbumSearchResult {
    albums: DeezerAlbum[];
    total: number;
    nextIndex: number | null;
}

export interface ArtistDescription {
    bio?: string,       
    genre?: string,
    country?: string,
    thumbnail?: string,
}

export interface Song {
    filePath: string
    fileUrl: string
    query: string
}

type SongContextType = {
    searchDeezer: (query: string, options?: DeezerSearchOptions) => Promise<DeezerSearchResult>
    searchDeezerAlbums: (query: string, options?: DeezerSearchOptions) => Promise<DeezerAlbumSearchResult>
    lookupArtist: (name: string) => Promise<ArtistDescription>
    getTrackList: (id: number) => Promise<Array<DeezerTrack>>
    getAudio: (title: string, artist: string) => Promise<Song>
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

    async function searchDeezerAlbums(
        query: string,
        options: DeezerSearchOptions = {}
    ): Promise<DeezerAlbumSearchResult> {
        const json = await window.api.searchAlbums(query, options)

        if (json.error) throw new Error(`Deezer API error: ${json.error.message}`)

        return {
            albums: json.data,
            total: json.total,
            nextIndex: json.next ? (options.index ?? 0) + (options.limit ?? 25) : null,
        }
    }

    async function getTrackList(
        id: number,
    ): Promise<Array<DeezerTrack>> {
        const json = await window.api.getDeezerAlbumTracklist(id)

        if (json.error) throw new Error(`Deezer API error: ${json.error.message}`)

        return json.data
    }


    async function lookupArtist(
        name: string,
    ): Promise<ArtistDescription> {
        const json = await window.api.lookupArtist(name)

        if (json.error) throw new Error(`Artist lookup error: ${json.error.message}`)

        return {
            bio: json.bio,
            genre: json.genre,
            country: json.country,
            thumbnail: json.thumbail,
        }
    }

    async function getAudio(
        title: string,
        artist: string
    ): Promise<Song> {
        const json = await window.api.downloadYoutubeAudio(title, artist)

        if (json.error) throw new Error(`Song playing error: ${json.error.message}`)
        
        return json
    }

    const ctx = {
        searchDeezer,
        lookupArtist,
        searchDeezerAlbums,
        getTrackList,
        getAudio,
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