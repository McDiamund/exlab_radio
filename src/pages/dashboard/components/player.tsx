import React, { JSX } from 'react'

function Player(): JSX.Element {

    return (
        <div id="player" className='bg-stone-950 min-h-[10vh] flex flex-col gap-3 justify-center items-center rounded-md px-6'>
            <div className='h-1' />
            <div id="scrubber" className='w-full h-[4px] bg-stone-300'></div>
            <div id="controls" className='h-auto flex items-center gap-3'>

                <svg width={20} height={20} fill='#b3b3b3'>
                    <path 
                        d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"
                         transform="scale(1.2)"></path>
                </svg>

                <svg xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 30 30"
                    width="30"
                    >

                    <circle cx="15" cy="15" r="15"
                            fill="white" stroke="black" strokeWidth="2"/>

                    <polygon points="11,9 11,21 22.5,15" fill="black"/>
                </svg>

                {/* <svg xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 30 30"
                    width="33"
                    >
                    <circle cx="15" cy="15" r="14"
                            fill="white" stroke="black" strokeWidth="0.5"/>
                    <rect x="9" y="9" width="4" height="12" rx="1" fill="black"/>
                    <rect x="17" y="9" width="4" height="12" rx="1" fill="black"/>
                </svg> */}
            
                <svg width={20} height={20} fill='#b3b3b3'>
                    <path 
                        d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"
                        transform='scale(1.2)'></path>
                </svg>

            </div>
        </div>
    )
}

export default Player