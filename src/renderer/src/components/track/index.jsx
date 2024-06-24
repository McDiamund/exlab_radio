import React, { useContext, useEffect } from 'react'
import styles from './track.module.css';
import { SongAPIContext } from '../../contexts/song_api';

const Track = (props) => {
    const { getAlbum } = useContext(SongAPIContext);

    if (props.track.type == "track") {
        return (
            <div key={props.track.id} className={styles.track}>
                <img src={props.cover || props.track.album.images[0].url} className={styles.cover} />
                <div className={styles.info}>
                    <h3>{props.track.name}</h3>
                    <p>{props.track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
            </div>
        )
    } else {
        return (
            <div onClick={() => getAlbum(props.track.id, props.access_token)}  key={props.track.id} className={styles.album}>
                <img src={props.cover || props.track.images[0].url} className={styles.cover} />
                <div className={styles.info}>
                    <h3>{props.track.name}</h3>
                    <p>{props.track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
            </div>
        )
    }

}

export default Track