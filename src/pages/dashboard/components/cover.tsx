import React, { JSX } from 'react'

type CoverImageInput = {
    img?: String 
}

function CoverImage(props: CoverImageInput): JSX.Element {

    return (
        <div
        id="cover"
        style={{
            backgroundImage: props.img ? `url(${props.img})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'local',
            backgroundColor: 'black',
            aspectRatio: '1 / 1',
            maxWidth: '45vw',
            minHeight: '45vh',
            borderRadius: '6px',
        }}
    />
    )
}

export default CoverImage