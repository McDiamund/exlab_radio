import React, { JSX, useEffect, useRef, useState } from 'react'
import { DeezerAlbum, DeezerTrack } from '../../contexts/SongContext'
import type { LocalPlaylist } from './createPlaylistModal'

/** Deezer album tracklist items often omit `track.album`; use the open album when saving to a playlist. */
function trackPayloadForPlaylist(
    track: DeezerTrack,
    albumContext?: DeezerAlbum,
): DeezerTrack {
    if (!albumContext) return track
    const a = track.album
    const hasUsableAlbum =
        a &&
        (Boolean(a.cover) ||
            Boolean(a.cover_medium) ||
            Boolean(a.cover_small))
    if (hasUsableAlbum) return track
    return { ...track, album: albumContext }
}

type Props = {
    track: DeezerTrack
    playlists: LocalPlaylist[]
    onPlaylistsChanged?: () => void
    /** When adding from the album tracklist sidebar, pass the parent album. */
    albumContext?: DeezerAlbum
}

export default function TrackAddToPlaylistMenu({
    track,
    playlists,
    onPlaylistsChanged,
    albumContext,
}: Props): JSX.Element {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent) => {
            if (
                rootRef.current &&
                !rootRef.current.contains(e.target as Node)
            ) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', close, true)
        return () => document.removeEventListener('mousedown', close, true)
    }, [open])

    const add = async (playlistId: string) => {
        try {
            const payload = trackPayloadForPlaylist(track, albumContext)
            await window.api.playlistsAddTrack({ playlistId, track: payload })
            setOpen(false)
            onPlaylistsChanged?.()
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
        }
    }

    return (
        <div ref={rootRef} className="relative shrink-0 self-center">
            <button
                type="button"
                className="rounded p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Track options"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((o) => !o)
                }}
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>
            {open ? (
                <div
                    className="absolute right-0 top-full z-[100] mt-1 min-w-[220px] rounded-md border border-stone-600 bg-[#2a2a2a] py-1 shadow-lg"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                        Add to playlist
                    </p>
                    {playlists.length === 0 ? (
                        <p className="px-3 pb-2 text-sm text-stone-400">
                            Create a playlist from the dashboard first.
                        </p>
                    ) : (
                        <ul className="max-h-56 overflow-y-auto">
                            {playlists.map((p) => (
                                <li key={p.id} role="none">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="block w-full truncate px-3 py-2 text-left text-sm text-white hover:bg-[#77933c]"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            void add(p.id)
                                        }}
                                    >
                                        {p.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    )
}
