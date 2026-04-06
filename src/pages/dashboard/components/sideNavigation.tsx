import React, { JSX } from 'react'
import { DeezerAlbum, DeezerTrack } from '../../../contexts/SongContext'
import type { LocalPlaylist } from './createPlaylistModal'
import TrackAddToPlaylistMenu from './trackAddToPlaylistMenu'

export type AlbumTrackList = {
    kind: 'album'
    album: DeezerAlbum
    tracks: DeezerTrack[]
}

export type PlaylistTrackList = {
    kind: 'playlist'
    playlist: Pick<
        LocalPlaylist,
        'id' | 'name' | 'description' | 'coverUrl'
    >
    tracks: DeezerTrack[]
}

export type TrackList = AlbumTrackList | PlaylistTrackList

export interface SideNavigationProps {
    tracklist?: TrackList
    selectSong: (track: DeezerTrack, album?: DeezerAlbum) => void
    playlists: LocalPlaylist[]
    onPlaylistsChanged?: () => void
    onRemoveTrackFromPlaylist?: (trackId: number) => void
    onDeleteOpenPlaylist?: () => void
}

function trackRowCoverUrl(track: DeezerTrack, tracklist: TrackList): string {
    if (tracklist.kind === 'album') {
        const pa = tracklist.album
        const fromParent =
            pa?.cover_medium ??
            pa?.cover ??
            pa?.cover_small ??
            pa?.cover_big ??
            pa?.cover_xl ??
            ''
        if (fromParent) return fromParent
        const a = track.album
        return (
            a?.cover_medium ??
            a?.cover ??
            a?.cover_small ??
            a?.cover_big ??
            a?.cover_xl ??
            ''
        )
    }
    const a = track.album
    const fromTrack =
        a?.cover_medium ??
        a?.cover ??
        a?.cover_small ??
        a?.cover_big ??
        a?.cover_xl ??
        ''
    if (fromTrack) return fromTrack
    return tracklist.playlist.coverUrl ?? ''
}

function SideNavigation(props: SideNavigationProps): JSX.Element {
    const {
        tracklist,
        onPlaylistsChanged,
        onRemoveTrackFromPlaylist,
        onDeleteOpenPlaylist,
    } = props

    return (
        <div id="results" className="bg-[#353535] h-full p-5 text-stone-100">
            {tracklist ? (
                <div className="flex h-full flex-col gap-2">
                    {tracklist.kind === 'playlist' ? (
                        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-stone-600 pb-2">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">
                                    {tracklist.playlist.name}
                                </p>
                                {tracklist.playlist.description ? (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-400">
                                        {tracklist.playlist.description}
                                    </p>
                                ) : null}
                            </div>
                            {onDeleteOpenPlaylist ? (
                                <button
                                    type="button"
                                    className="shrink-0 rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:border-red-800 hover:bg-red-950/50 hover:text-red-200"
                                    onClick={() => onDeleteOpenPlaylist()}
                                >
                                    Delete playlist
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    <div
                        id="tracks"
                        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
                    >
                        {tracklist.tracks.length === 0 ? (
                            <p className="text-sm text-stone-400">
                                {tracklist.kind === 'playlist'
                                    ? 'No tracks in this playlist yet.'
                                    : 'No tracks.'}
                            </p>
                        ) : (
                            tracklist.tracks.map((track, i) => {
                                const cover = trackRowCoverUrl(track, tracklist)
                                const albumForPlay =
                                    tracklist.kind === 'album'
                                        ? tracklist.album
                                        : undefined
                                return (
                                    <div
                                        id="track"
                                        key={track.id ?? i}
                                        className="flex gap-2 p-2 text-white hover:bg-[#77933c]"
                                    >
                                        <div
                                            className="flex min-w-0 flex-1 cursor-pointer gap-4"
                                            onClick={() =>
                                                props.selectSong(
                                                    track,
                                                    albumForPlay,
                                                )
                                            }
                                        >
                                            <div
                                                id="track-cover"
                                                style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    flexShrink: 0,
                                                    backgroundImage: cover
                                                        ? `url(${cover})`
                                                        : 'none',
                                                    backgroundSize: 'cover',
                                                }}
                                            />
                                            <div className="flex min-w-0 flex-col gap-0.5">
                                                <p className="truncate text-sm">
                                                    {track.title}
                                                </p>
                                                <p className="truncate text-xs">
                                                    {track.artist?.name ?? '—'}
                                                </p>
                                                {tracklist.kind === 'playlist' &&
                                                track.album?.title ? (
                                                    <p className="truncate text-xs text-stone-400">
                                                        {track.album.title}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        {tracklist.kind === 'playlist' &&
                                        typeof track.id === 'number' &&
                                        onRemoveTrackFromPlaylist ? (
                                            <button
                                                type="button"
                                                className="shrink-0 self-center rounded p-2 text-stone-400 hover:bg-red-950/60 hover:text-red-200"
                                                title="Remove from playlist"
                                                aria-label="Remove from playlist"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onRemoveTrackFromPlaylist(
                                                        track.id,
                                                    )
                                                }}
                                            >
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    aria-hidden
                                                >
                                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                </svg>
                                            </button>
                                        ) : null}
                                        <TrackAddToPlaylistMenu
                                            track={track}
                                            playlists={props.playlists}
                                            onPlaylistsChanged={
                                                onPlaylistsChanged
                                            }
                                            albumContext={
                                                tracklist.kind === 'album'
                                                    ? tracklist.album
                                                    : undefined
                                            }
                                        />
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default SideNavigation
