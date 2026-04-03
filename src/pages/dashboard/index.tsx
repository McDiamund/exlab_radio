import React, { JSX, useEffect, useState } from 'react'
import CoverImage from './components/cover'
import Description, { DescriptionInput } from './components/description'
import Player from './components/player'
import Results from './components/results'
import { DeezerAlbum, DeezerAlbumSearchResult, DeezerSearchResult, DeezerTrack, useSongContext } from '../../contexts/SongContext'


function Dashboard(): JSX.Element {
    
    const { searchDeezer, searchDeezerAlbums, lookupArtist } = useSongContext();
    
    const [tracks, setTracks] = useState<Array<DeezerTrack>>([])
    const [albums, setAlbums] = useState<Array<DeezerAlbum>>([])
    const [description, setDescription] = useState<DescriptionInput>({})
    const [cover, setCover] = useState('')

    const searchSongs = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value.trim()) {setTracks([]); return }

        try {
            const response: DeezerSearchResult = await searchDeezer(e.target.value);
            setTracks(response.tracks)
        } catch(e) {
            alert(e)
        }
    }

    const searchAlbums = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value.trim()) {setTracks([]); return }

        try {
            const response: DeezerAlbumSearchResult = await searchDeezerAlbums(e.target.value);
            setAlbums(response.albums)
        } catch(e) {
            alert(e)
        }
    }

    const search = async (e: React.ChangeEvent<HTMLInputElement>) => {
        searchSongs(e);
        searchAlbums(e);
    }

    const selectSong = async (track: DeezerTrack) => {
        setCover(track.album.cover_xl);

        const description = await lookupArtist(track.artist.name);

        setDescription({ track_title: track.title, artist_name: track.artist.name, artist_picture: track.artist.picture_big, artist_description: description.bio })
    }

    return (
        <div className='bg-amber-50 h-screen flex overflow-hidden p-3'>
            <div id="left-info-section" className='w-[30%] flex flex-col gap-3'>
                <CoverImage img={cover} />
                <Description description={description} />
            </div>
            <div id="center-navigation-section" className='w-[40%] flex flex-col gap-3 px-3'>
                <div id="dashboard" className='bg-black flex flex-col gap-3 h-full min-h-[65vh] rounded-md px-5 py-3'>
                    <div id="search-bar" className='border-b-stone-100 gap-3 border-b-2 w-full h-10 text-stone-100 flex items-center px-2'>
                        <svg width={30} height={25}><path fill='white'  d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path></svg>
                        <input className='w-full' onChange={search} />
                        <svg width={25} height={25}><path fill='white' d="M3.293 3.293a1 1 0 0 1 1.414 0L12 10.586l7.293-7.293a1 1 0 1 1 1.414 1.414L13.414 12l7.293 7.293a1 1 0 0 1-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L10.586 12 3.293 4.707a1 1 0 0 1 0-1.414"></path></svg>
                    </div>
                    <div id="tracks" className='flex flex-col gap-3 h-full  overflow-y-scroll'>
                        {tracks.map(
                            (track, i) => { 
                                return (
                                    <div id="track" key={i} className='text-white rounded-md cursor-pointer flex gap-4 p-2 hover:bg-stone-800' onClick={() => selectSong(track)}>
                                        <div id="track-cover" className={`w-15 h-15 rounded-sm`} style={track.album.cover ? { background: `url(${track.album.cover})`, backgroundSize: 'cover'} : { backgroundColor: 'green'}}></div> 
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
                </div>
                <Player />
            </div>
            <div id="right-info-section" className='w-[30%] flex-col gap-1'>
                <Results />
            </div>
        </div>
    )
}

export default Dashboard