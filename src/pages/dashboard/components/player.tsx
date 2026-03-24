import React, { JSX } from 'react'

function Player(): JSX.Element {

    return (
        <div id="player" className='bg-red-300 min-h-[10vh] rounded-md'>
            <div id="scrubber"></div>
            <div id="controls"></div>
        </div>
    )
}

export default Player