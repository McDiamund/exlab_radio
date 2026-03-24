import React, { JSX } from 'react'
import CoverImage from './components/cover'
import Description from './components/description'
import Player from './components/player'
import Results from './components/results'

function Dashboard(): JSX.Element {

    return (
        <div className='bg-amber-50 h-screen flex overflow-hidden p-3'>
            <div id="left-info-section" className='w-[30%] flex flex-col gap-3'>
                <CoverImage />
                <Description />
            </div>
            <div id="center-navigation-section" className='w-[40%] flex flex-col gap-3 px-3'>
                <div id="dashboard" className='bg-blue-300 h-full min-h-[65vh] rounded-md'></div>
                <Player />
            </div>
            <div id="right-info-section" className='w-[30%] flex-col gap-1'>
                <Results />
            </div>
        </div>
    )
}

export default Dashboard