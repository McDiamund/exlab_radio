import React, { useEffect } from 'react'
import styles from './track.module.css';

const Track = (props) => {

    if (props.track.type == "track") {
        return (
            <div key={props.track.id} className={styles.track}>
                <img src={props.track.album.images[0].url} className={styles.cover} />
                <div className={styles.info}>
                    <h3>{props.track.name}</h3>
                    <p>{props.track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
            </div>
        )
    } else {
        return (
            <div key={props.track.id} className={styles.album}>
                <img src={props.track.images[0].url} className={styles.cover} />
                <div className={styles.info}>
                    <h3>{props.track.name}</h3>
                    <p>{props.track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
            </div>
        )
    }

}

export default Track