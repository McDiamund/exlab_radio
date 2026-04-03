import React, { JSX, useEffect, useRef, useState } from 'react'
import CoverImage from './components/cover'
import Description, { DescriptionInput } from './components/description'
import Player from './components/player'
import { DeezerAlbum, DeezerAlbumSearchResult, DeezerSearchResult, DeezerTrack, useSongContext } from '../../contexts/SongContext'
import { buildBackgroundGradientFromDataUrl } from '../../utils/extractCoverGradient'
import SideNavigation, { TrackList } from './components/sideNavigation';

const DEFAULT_PAGE_BACKGROUND =
    'linear-gradient(145deg, oklch(99% 0.018 95.277) 0%, oklch(96.5% 0.024 95.277) 100%)'


function Dashboard(): JSX.Element {
    
    const { searchDeezer, searchDeezerAlbums, lookupArtist, getTrackList } = useSongContext();
    
    const [tracks, setTracks] = useState<Array<DeezerTrack>>([])
    const [albums, setAlbums] = useState<Array<DeezerAlbum>>([])
    const [description, setDescription] = useState<DescriptionInput>({})
    const [cover, setCover] = useState('')
    const [pageBackground, setPageBackground] = useState(DEFAULT_PAGE_BACKGROUND)
    
    const [tracklist, setTracklist] = useState<TrackList | undefined>()
    const [isSearching, setSearching] = useState<boolean>(false)
    const albumsRef = useRef<HTMLDivElement>(null)

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

    const clear = () => {
        setTracks([])
        setAlbums([])
        setTracklist(undefined)
    }

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
        if (!album) {
            setCover(track.album.cover_xl);
        } else {
            setCover(album.cover_xl)
        }
        const description = await lookupArtist(track.artist.name);
        setDescription({ track_title: track.title, artist_name: track.artist.name, artist_picture: track.artist.picture_big, artist_description: description.bio })
    }

    const selectAlbum = async (album: DeezerAlbum) => {
        try {
            const tracklist = await getTrackList(album.id);
            setTracklist({album: album, tracks: tracklist})
        } catch (e) {
            alert(e)
        }
    }

    return (
        <div
            style={{
                background: pageBackground,
                backgroundColor: 'oklch(98.7% 0.022 95.277)',
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
                        <div id="dashboard-header" className='flex p-3'>
                            <svg id="search-button" onClick={toggleSearch} width={30} height={25}><path fill='white'  d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path></svg>
                        </div>
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
                                                <div id="track" key={i} className='text-white  cursor-pointer flex gap-4 p-2 hover:bg-[#77933c]' onClick={() => selectSong(track)}>
                                                    <div id="track-cover" style={{width: '60px', height: '60px', backgroundImage: track.album.cover ? `url(${track.album.cover})` : 'none', backgroundSize: 'cover'}}></div> 
                                                    <div className='flex flex-col gap-0.5'>
                                                        <p className='text'>{track.title}</p>
                                                        <p className='text-xs'>{track.album.title}</p>
                                                        <p className='text-xs'>{track.artist.name}</p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            </>
                        )
                    }
                </div>
                <Player />
            </div>
            <div id="right-info-section" className='w-[30%] flex-col gap-1'>
                <SideNavigation tracklist={tracklist} selectSong={selectSong}/>
            </div>
        </div>
    )
}

export default Dashboard