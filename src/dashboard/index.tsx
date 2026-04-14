import React, { JSX, useCallback, useEffect, useRef, useState } from 'react'
import CoverImage from './components/cover'
import Description, { DescriptionInput } from './components/description'
import Player from './components/player'
import {
    ArtistDescription,
    DeezerAlbum,
    DeezerAlbumSearchResult,
    DeezerSearchResult,
    DeezerTrack,
    useSongContext,
} from '../contexts/SongContext'
import { buildBackgroundGradientFromDataUrl } from '../utils/extractCoverGradient'
import SideNavigation, { TrackList } from './components/sideNavigation'
import AudioDownloadSetup from './components/audioDownloadSetup'
import NetworkStreamPanel, {
    type LanStreamHit,
} from './components/networkStreamPanel'
import CreatePlaylistModal, {
    type LocalPlaylist,
} from './components/createPlaylistModal'
import TrackAddToPlaylistMenu from './components/trackAddToPlaylistMenu'

const DEFAULT_PAGE_BACKGROUND =
    'linear-gradient(145deg, oklch(99% 0.018 95.277) 0%, oklch(96.5% 0.024 95.277) 100%)'

const MAX_PLAYLISTS = 8

type LanFollowConfig = {
    infoUrl: string
    streamUrlWithoutQuery: string
}

type HostSyncSnapshot = {
    revision: number
    positionSec: number
    playing: boolean
}

function Dashboard(): JSX.Element {
    
    const { searchDeezer, searchDeezerAlbums, getTrackList, getAudio } = useSongContext();
    
    const [tracks, setTracks] = useState<Array<DeezerTrack>>([])
    const [albums, setAlbums] = useState<Array<DeezerAlbum>>([])
    const [playlists, setPlaylists] = useState<LocalPlaylist[]>([])
    const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false)
    const [description, setDescription] = useState<DescriptionInput>({})
    const [cover, setCover] = useState('')
    const [pageBackground, setPageBackground] = useState(DEFAULT_PAGE_BACKGROUND)
    
    const [audioSrc, setAudioSrc] = useState<string | undefined>()
    const [audioDownloading, setAudioDownloading] = useState(false)
    const [tracklist, setTracklist] = useState<TrackList | undefined>()
    const [isSearching, setSearching] = useState<boolean>(false)
    const albumsRef = useRef<HTMLDivElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const playlistFetchOkRef = useRef(true)
    const hostSyncRef = useRef<HostSyncSnapshot | null>(null)

    const [lanFollow, setLanFollow] = useState<LanFollowConfig | null>(null)
    const [hostSync, setHostSync] = useState<HostSyncSnapshot | null>(null)

    const refreshPlaylists = useCallback(() => {
        return window.api
            .playlistsGet()
            .then((list) => {
                if (!playlistFetchOkRef.current) return
                const normalized: LocalPlaylist[] = list.map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    createdAt: p.createdAt,
                    coverUrl: p.coverUrl,
                    tracks: (p.tracks ?? []) as DeezerTrack[],
                }))
                setPlaylists(normalized)
                setTracklist((prev) => {
                    if (!prev || prev.kind !== 'playlist') return prev
                    const updated = normalized.find(
                        (pl) => pl.id === prev.playlist.id,
                    )
                    if (!updated) return undefined
                    return {
                        kind: 'playlist' as const,
                        playlist: {
                            id: updated.id,
                            name: updated.name,
                            description: updated.description,
                            coverUrl: updated.coverUrl,
                        },
                        tracks: updated.tracks,
                    }
                })
            })
            .catch(() => {
                if (playlistFetchOkRef.current) setPlaylists([])
            })
    }, [])

    useEffect(() => {
        playlistFetchOkRef.current = true
        void refreshPlaylists()
        return () => {
            playlistFetchOkRef.current = false
        }
    }, [refreshPlaylists])

    useEffect(() => {
        if (!isSearching) return
        const el = albumsRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth) return
            e.preventDefault()
            el.scrollLeft += e.deltaY
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [isSearching])

    useEffect(() => {
        let cancelled = false
        if (!cover.trim()) {
            setPageBackground(DEFAULT_PAGE_BACKGROUND)
            return
        }
        ;(async () => {
            try {
                const dataUrl: string = await window.api.fetchImageDataUrl(cover)
                if (cancelled) return
                const bg = await buildBackgroundGradientFromDataUrl(dataUrl)
                if (!cancelled) setPageBackground(bg)
            } catch {
                if (!cancelled) setPageBackground(DEFAULT_PAGE_BACKGROUND)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [cover])

    hostSyncRef.current = hostSync

    useEffect(() => {
        if (!lanFollow) return
        const el = audioRef.current
        if (!el) return
        const alignToHost = () => {
            const hs = hostSyncRef.current
            if (!hs) return
            const d = el.duration
            if (!Number.isFinite(d) || d <= 0) return
            const safeEnd = Math.max(0, d - 0.02)
            const t = Math.min(Math.max(0, hs.positionSec), safeEnd)
            if (!hs.playing) {
                el.pause()
                const atEnd =
                    el.ended ||
                    el.currentTime >= d - 0.4 ||
                    hs.positionSec >= d - 1.25
                if (atEnd) return
                if (Math.abs(el.currentTime - t) > 1.0) el.currentTime = t
                return
            }
            if (el.ended) el.currentTime = Math.min(t, safeEnd)
            if (Math.abs(el.currentTime - t) > 0.5) el.currentTime = t
            void el.play().catch(() => {})
        }
        el.addEventListener('loadedmetadata', alignToHost)
        alignToHost()
        return () => el.removeEventListener('loadedmetadata', alignToHost)
    }, [lanFollow, audioSrc])

    useEffect(() => {
        if (!lanFollow || !hostSync) return
        const el = audioRef.current
        if (!el) return
        if (el.readyState < HTMLMediaElement.HAVE_METADATA) return
        const d = el.duration
        if (!Number.isFinite(d) || d <= 0) return

        const safeEnd = Math.max(0, d - 0.02)
        const tHost = Math.min(Math.max(0, hostSync.positionSec), safeEnd)

        if (!hostSync.playing) {
            el.pause()
            const atEnd =
                el.ended ||
                el.currentTime >= d - 0.4 ||
                hostSync.positionSec >= d - 1.25
            if (atEnd) {
                return
            }
            if (Math.abs(el.currentTime - tHost) > 1.2) {
                el.currentTime = tHost
            }
            return
        }

        if (el.ended) {
            el.currentTime = Math.min(tHost, safeEnd)
        }
        if (Math.abs(el.currentTime - tHost) > 0.55) {
            el.currentTime = tHost
        }
        if (el.paused) void el.play().catch(() => {})
    }, [lanFollow, hostSync])

    useEffect(() => {
        if (!lanFollow) return
        const id = window.setInterval(() => {
            void (async () => {
                try {
                    const r = await fetch(lanFollow.infoUrl, { cache: 'no-store' })
                    const data = (await r.json()) as Record<string, unknown>
                    if (data.app !== 'exlab-radio') return
                    const rev =
                        typeof data.playbackRevision === 'number' ? data.playbackRevision : 0
                    const positionSec =
                        typeof data.positionSec === 'number' ? data.positionSec : 0
                    const playing = typeof data.playing === 'boolean' ? data.playing : false
                    const title = String(data.title ?? '')
                    const artist = String(data.artist ?? '')
                    const desc = String(data.description ?? '')
                    const rawCover = data.coverUrl
                    setHostSync((prev) => {
                        const next = { revision: rev, positionSec, playing }
                        if (!prev) return next
                        if (prev.revision !== next.revision) return next
                        if (prev.playing !== next.playing) return next
                        if (next.playing) return next
                        if (Math.abs(prev.positionSec - next.positionSec) < 0.12) {
                            return prev
                        }
                        return next
                    })
                    setAudioSrc((prev) => {
                        const next = `${lanFollow.streamUrlWithoutQuery}?r=${rev}`
                        return prev === next ? prev : next
                    })
                    setDescription({
                        track_title: title,
                        artist_name: artist,
                        stream_description: desc,
                    })
                    if (typeof rawCover === 'string') setCover(rawCover)
                    else if (rawCover === null) setCover('')
                } catch {
                    /* ignore transient network errors */
                }
            })()
        }, 400)
        return () => clearInterval(id)
    }, [lanFollow])

    useEffect(() => {
        if (lanFollow) return
        const el = audioRef.current
        if (!el) return
        let lastPush = 0
        const push = () => {
            const now = Date.now()
            if (now - lastPush < 200) return
            lastPush = now
            void window.api
                .networkBroadcastSetPlaybackState({
                    positionSec: el.currentTime,
                    playing: !el.paused,
                })
                .catch(() => {})
        }
        el.addEventListener('timeupdate', push)
        el.addEventListener('play', push)
        el.addEventListener('pause', push)
        el.addEventListener('seeked', push)
        el.addEventListener('ended', push)
        push()
        return () => {
            el.removeEventListener('timeupdate', push)
            el.removeEventListener('play', push)
            el.removeEventListener('pause', push)
            el.removeEventListener('seeked', push)
            el.removeEventListener('ended', push)
        }
    }, [lanFollow, audioSrc])

    const clear = () => {
        setTracks([])
        setAlbums([])
        setTracklist(undefined)
    }

    const tuneIntoLanStream = useCallback(async (hit: LanStreamHit) => {
        const { info } = hit
        if (!info.hasAudio) {
            window.alert('That device is not sharing an audio file yet. Start playback there first.')
            return
        }
        let origin: string
        try {
            origin = new URL(info.streamUrl).origin
        } catch {
            window.alert('Invalid stream URL from broadcaster.')
            return
        }
        const infoUrl = `${origin}/exlab-radio/info`
        const streamUrlWithoutQuery = info.streamUrl.split('?')[0]

        let rev = info.playbackRevision ?? 0
        let positionSec = info.positionSec ?? 0
        let playing = info.playing ?? false
        try {
            const r = await fetch(infoUrl, { cache: 'no-store' })
            const data = (await r.json()) as Record<string, unknown>
            if (data.app === 'exlab-radio') {
                if (typeof data.playbackRevision === 'number') rev = data.playbackRevision
                if (typeof data.positionSec === 'number') positionSec = data.positionSec
                if (typeof data.playing === 'boolean') playing = data.playing
            }
        } catch {
            /* use scan snapshot */
        }

        setLanFollow({ infoUrl, streamUrlWithoutQuery })
        setHostSync({ revision: rev, positionSec, playing })
        setAudioDownloading(false)
        setAudioSrc(`${streamUrlWithoutQuery}?r=${rev}`)
        setCover(info.coverUrl ?? '')
        setDescription({
            track_title: info.title,
            artist_name: info.artist,
            stream_description: info.description,
        })
    }, [])

    const toggleSearch = () => {
        clear();
        setSearching(!isSearching);
    }

    const searchSongs = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const response: DeezerSearchResult = await searchDeezer(e.target.value);
            setTracks(response.tracks)
        } catch(e) {
            alert(e)
        }
    }

    const searchAlbums = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const response: DeezerAlbumSearchResult = await searchDeezerAlbums(e.target.value);
            setAlbums(response.albums)
        } catch(e) {
            alert(e)
        }
    }

    const search = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value.trim()) { clear(); return }
        searchSongs(e);
        searchAlbums(e);
    }

    const selectSong = async (track: DeezerTrack, album?: DeezerAlbum) => {
        setLanFollow(null)
        setHostSync(null)

        if (!album) {
            setCover(track.album.cover_xl);
        } else {
            setCover(album.cover_xl)
        }

        setAudioSrc(undefined)
        setAudioDownloading(true)

        try {
            setDescription({
                track_title: track.title,
                artist_name: track.artist.name,
                artist_picture: track.artist.picture_big,
            })
            const audio = await getAudio(track.title, track.artist.name)
            setAudioSrc(audio.fileUrl)
            const coverForBroadcast = album?.cover_xl ?? track.album.cover_xl
            void window.api
                .networkBroadcastSetNowPlaying({
                    audioFilePath: audio.filePath,
                    title: track.title,
                    artist: track.artist.name,
                    description: '',
                    coverUrl: coverForBroadcast,
                })
                .catch(() => {
                    /* broadcast metadata is best-effort */
                })
        } catch (e) {
            alert(e)
        } finally {
            setAudioDownloading(false)
        }
    }

    const selectAlbum = async (album: DeezerAlbum) => {
        try {
            const tracks = await getTrackList(album.id)
            setTracklist({ kind: 'album', album, tracks })
        } catch (e) {
            alert(e)
        }
    }

    const selectPlaylist = (playlist: LocalPlaylist) => {
        setTracklist({
            kind: 'playlist',
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                coverUrl: playlist.coverUrl,
            },
            tracks: playlist.tracks ?? [],
        })
    }

    const onPlaylistCreated = (playlist: LocalPlaylist) => {
        setPlaylists((prev) => [
            { ...playlist, tracks: playlist.tracks ?? [] },
            ...prev,
        ])
    }

    const removeTrackFromPlaylist = async (trackId: number) => {
        if (tracklist?.kind !== 'playlist') return
        try {
            await window.api.playlistsRemoveTrack({
                playlistId: tracklist.playlist.id,
                trackId,
            })
            await refreshPlaylists()
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
        }
    }

    const deletePlaylistById = async (playlistId: string) => {
        try {
            await window.api.playlistsDelete({ playlistId })
            setTracklist((prev) =>
                prev?.kind === 'playlist' && prev.playlist.id === playlistId
                    ? undefined
                    : prev,
            )
            await refreshPlaylists()
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
        }
    }

    const confirmDeletePlaylist = (playlistId: string) => {
        if (
            !confirm(
                'Delete this playlist and all of its saved tracks? This cannot be undone.',
            )
        ) {
            return
        }
        void deletePlaylistById(playlistId)
    }

    return (
        <div
            style={{
                background: pageBackground,
                // backgroundColor: 'oklch(98.7% 0.022 95.277)',
                height: '100vh',
                display: 'flex',
                overflow: 'hidden',
                padding: '12px',
                transition: 'background 0.7s ease',
            }}
        >
            <div id="left-info-section" className='w-[30%] flex flex-col gap-3'>
                <CoverImage img={cover} />
                <Description description={description} />
            </div>
            <div id="center-navigation-section" className='w-[40%] flex flex-col gap-3 px-3'>
                <div id="dashboard" className='bg-[#353535] flex flex-col gap-3 h-full min-h-[65vh] px-5 py-3'>
                    { !isSearching && 
                        (
                            <>
                                <div id="dashboard-header" className='flex p-3'>
                                    <h1 className='flex-1 text-white'>EXLAB RADIO</h1>
                                    <svg id="search-button" onClick={toggleSearch} width={30} height={25}><path fill='white'  d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path></svg>
                                </div>

                                <div id="channel menu" className='flex flex-row gap-3 items-center bg-black p-3'>
                                    <h1 className='text-white flex-1'>Create your own radio station</h1>
                                    <button className='bg-[#77933c] text-white px-4 py-2'>Visit Stations</button>
                                </div>

                                <div id="playlists-header" className='flex px-3 py-2 items-center'>
                                    <h1 className='text-white flex-1'>Playlists</h1>
                                    <button
                                        type="button"
                                        className='bg-[#77933c] text-white px-4 py-2 disabled:cursor-not-allowed disabled:opacity-45'
                                        disabled={playlists.length >= MAX_PLAYLISTS}
                                        title={
                                            playlists.length >= MAX_PLAYLISTS
                                                ? `Maximum of ${MAX_PLAYLISTS} playlists`
                                                : undefined
                                        }
                                        onClick={() => setCreatePlaylistOpen(true)}
                                    >
                                        Create Playlist
                                    </button>
                                </div>

                                <div id="playlists" className='grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:grid-cols-4'>
                                    {playlists.length === 0 ? (
                                        <p className='col-span-full text-sm text-stone-400'>
                                            No playlists yet. Create one to save it on this device.
                                        </p>
                                    ) : (
                                        playlists.slice(0, MAX_PLAYLISTS).map((playlist) => (
                                            <div
                                                key={playlist.id}
                                                className='group relative flex flex-col overflow-hidden items-center gap-1 p-2 hover:bg-[#77933c]'
                                            >
                                                <button
                                                    type="button"
                                                    className='absolute right-1 top-1 z-10 rounded bg-black/70 p-1 text-stone-300 opacity-0 transition-opacity hover:bg-red-900/90 hover:text-white group-hover:opacity-100'
                                                    title="Delete playlist"
                                                    aria-label="Delete playlist"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        confirmDeletePlaylist(
                                                            playlist.id,
                                                        )
                                                    }}
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        aria-hidden
                                                    >
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                    </svg>
                                                </button>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() =>
                                                        selectPlaylist(playlist)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === 'Enter' ||
                                                            e.key === ' '
                                                        ) {
                                                            e.preventDefault()
                                                            selectPlaylist(playlist)
                                                        }
                                                    }}
                                                    className='flex w-full cursor-pointer flex-col items-center gap-1'
                                                >
                                                    <div
                                                        className='aspect-square w-full bg-stone-900 bg-cover bg-center'
                                                        style={{
                                                            backgroundImage:
                                                                playlist.coverUrl
                                                                    ? `url(${playlist.coverUrl})`
                                                                    : undefined,
                                                        }}
                                                    />
                                                    <p className='truncate text-xs text-white'>
                                                        {playlist.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <AudioDownloadSetup />
                                <NetworkStreamPanel onTuneIn={tuneIntoLanStream} />
                            </>
                        )
                    }
                    {
                        isSearching && (
                            <>
                                <div id="search-bar" className='border-b-stone-100 gap-3 border-b-2 w-full h-10 text-stone-100 flex items-center px-2 pb-2 mt-2'>
                                    <svg width={30} height={25}><path fill='white'  d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path></svg>
                                    <input className='w-full' onChange={search} />
                                    <svg width={25} height={25} onClick={toggleSearch}><path fill='white' d="M3.293 3.293a1 1 0 0 1 1.414 0L12 10.586l7.293-7.293a1 1 0 1 1 1.414 1.414L13.414 12l7.293 7.293a1 1 0 0 1-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L10.586 12 3.293 4.707a1 1 0 0 1 0-1.414"></path></svg>
                                </div>
                                        <div
                                            ref={albumsRef}
                                            id="albums"
                                            className='flex flex-row flex-nowrap gap-4 overflow-x-auto overflow-y-hidden h-[400px]'
                                        >
                                            {albums.map(
                                                (album, i) => {
                                                    return (
                                                        <div id="album" key={i} onClick={() => selectAlbum(album)} className='text-white hover:bg-[#77933c] p-2 box-border cursor-pointer'>
                                                            <div id="album-cover" style={{ width: '180px', height: '180px', backgroundImage: album.cover_medium ? `url(${album.cover_medium})` : 'none', backgroundSize: 'cover', marginBottom: '8px'}} />
                                                            <div id="album-title" className='flex flex-col gap-1'>
                                                                <p className='text-xs'>{album.title}</p>
                                                                <p className='text-xs'>{album.artist.name}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            )}
                                        </div>
                                <div id="tracks" className='flex flex-col gap-3 h-full overflow-y-auto'>
                                    {tracks.map(
                                        (track, i) => { 
                                            return (
                                                <div
                                                    id="track"
                                                    key={track.id ?? i}
                                                    className='text-white flex gap-2 p-2 hover:bg-[#77933c]'
                                                >
                                                    <div
                                                        className='flex min-w-0 flex-1 cursor-pointer gap-4'
                                                        onClick={() => selectSong(track)}
                                                    >
                                                        <div id="track-cover" style={{width: '60px', height: '60px', flexShrink: 0, backgroundImage: track.album.cover ? `url(${track.album.cover})` : 'none', backgroundSize: 'cover'}}></div>
                                                        <div className='flex min-w-0 flex-col gap-0.5'>
                                                            <p className='truncate text-sm'>{track.title}</p>
                                                            <p className='truncate text-xs'>{track.album.title}</p>
                                                            <p className='truncate text-xs'>{track.artist.name}</p>
                                                        </div>
                                                    </div>
                                                    <TrackAddToPlaylistMenu
                                                        track={track}
                                                        playlists={playlists}
                                                        onPlaylistsChanged={
                                                            refreshPlaylists
                                                        }
                                                    />
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            </>
                        )
                    }
                </div>
                <Player
                    src={audioSrc}
                    audioRef={audioRef}
                    downloading={audioDownloading}
                    skipAutostart={Boolean(lanFollow)}
                    remoteControlled={Boolean(lanFollow)}
                    remoteScrubberTimeSec={lanFollow && hostSync ? hostSync.positionSec : null}
                    remoteScrubberPlaying={lanFollow && hostSync ? hostSync.playing : null}
                />
            </div>
            <div id="right-info-section" className='w-[30%] flex-col gap-1'>
                <SideNavigation
                    tracklist={tracklist}
                    selectSong={selectSong}
                    playlists={playlists}
                    onPlaylistsChanged={refreshPlaylists}
                    onRemoveTrackFromPlaylist={removeTrackFromPlaylist}
                    onDeleteOpenPlaylist={() => {
                        if (tracklist?.kind !== 'playlist') return
                        if (
                            !confirm(
                                'Delete this playlist and all of its saved tracks? This cannot be undone.',
                            )
                        ) {
                            return
                        }
                        void deletePlaylistById(tracklist.playlist.id)
                    }}
                />
            </div>

            <CreatePlaylistModal
                open={createPlaylistOpen}
                onClose={() => setCreatePlaylistOpen(false)}
                onCreated={onPlaylistCreated}
            />
        </div>
    )
}

export default Dashboard