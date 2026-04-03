import { JSX } from 'react'
import { DeezerAlbum, DeezerTrack } from '../../../contexts/SongContext'

export interface SideNavigationProps {
    tracklist?: TrackList
    selectSong: (track: DeezerTrack, album?: DeezerAlbum) => void
}

export interface TrackList {
    album: DeezerAlbum
    tracks: DeezerTrack[]
}


function SideNavigation(props: SideNavigationProps): JSX.Element {
    return (
        <div id="results" className="bg-[#353535] h-full p-5 text-stone-100">
            { props.tracklist && (
                <div id="tracks" className='flex flex-col gap-3 h-full overflow-y-auto'>
                    {props.tracklist.tracks.map((track, i) => (
                        <div id="track" key={i} onClick={() => props.selectSong(track, props.tracklist?.album)} className='text-white  cursor-pointer flex gap-4 p-2 hover:bg-[#77933c]'>
                            <div id="track-cover" style={{width: '60px', height: '60px', backgroundImage: props.tracklist ? `url(${props.tracklist.album.cover})` : 'none', backgroundSize: 'cover'}}></div> 
                            <div className='flex flex-col gap-0.5'>
                                <p className='text'>{track.title}</p>
                                <p className='text-xs'>{track.artist.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {

            }
        </div>
    )
}

export default SideNavigation
