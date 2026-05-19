import React, { JSX, useEffect } from 'react'
import { useSongContext } from '../../contexts/SongContext'

export interface DescriptionInput {
    track_title?: string,
    artist_name?: string,
    artist_picture?: string,
    artist_description?: string
    /** Shown when tuned into a LAN stream (broadcaster-supplied note). */
    stream_description?: string
}

function Description({ description }: { description: DescriptionInput }): JSX.Element {

    return (
        <div id="description" className='aspect-square overflow-scroll flex flex-col gap-1 min-h-[45vh] p-5 bg-[#353535] text-white'>
            <p className='text-2xl'>{description.track_title}</p>
            <p>{description.artist_name}</p>
            {description.stream_description?.trim() ? (
                <p className="mt-2 text-sm leading-relaxed text-stone-300 whitespace-pre-wrap">
                    {description.stream_description}
                </p>
            ) : null}
            <br />
        </div>
    )
}

export default Description