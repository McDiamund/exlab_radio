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
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'local',
            backgroundColor: '#353535',
            aspectRatio: '1 / 1',
            maxWidth: '45vw',
            minHeight: '45vh',
        }}
    />
    )
}

export default CoverImage