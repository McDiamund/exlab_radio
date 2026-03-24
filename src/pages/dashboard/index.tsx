import React, { JSX } from 'react'

function Dashboard(): JSX.Element {

    return (
        <div className='bg-amber-50 h-screen flex overflow-hidden p-3'>
            <div id="left-info-section" className='w-[30%] flex flex-col gap-3'>
                <div id="cover" className='aspect-square max-w-[45vw] min-h-[45vh] bg-green-400 rounded-md'></div>
                <div id="description" className='aspect-square min-h-[45vh] bg-black rounded-md'></div>
            </div>
            <div id="center-navigation-section" className='w-[40%] flex flex-col gap-3 px-3'>
                <div id="dashboard" className='bg-blue-300 h-full min-h-[65vh] rounded-md'></div>
                <div id="player" className='bg-red-300 min-h-[10vh] rounded-md'>
                    <div id="scrubber"></div>
                    <div id="controls"></div>
                </div>
            </div>
            <div id="right-info-section" className='w-[30%] flex-col gap-1'>
                <div id="results" className='bg-amber-200 h-full rounded-md'></div>
            </div>
        </div>
    )
}

export default Dashboard