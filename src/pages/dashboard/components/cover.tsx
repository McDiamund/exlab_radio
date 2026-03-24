import React, { JSX } from 'react'

type CoverImageInput = {
    img?: String 
}

function CoverImage(props: CoverImageInput): JSX.Element {

    return (
        <div 
            id="cover" 
            className={
            `aspect-square 
            max-w-[45vw] 
            min-h-[45vh] 
            rounded-md
            `}
            style={props.img ? { background: `url(${props.img})`, backgroundSize: 'cover'} : { backgroundColor: 'green'}}
            ></div>     
    )
}

export default CoverImage