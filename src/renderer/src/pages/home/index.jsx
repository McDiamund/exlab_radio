import { useContext, useEffect, useState } from 'react';
import styles from './home.module.css';
import { AuthContext } from '../../contexts/auth';


const Home = () => {

  const { getAuthToken, accessCode } = useContext(AuthContext);
  
  useEffect(() => {
  
    getAuthToken();

    console.log(accessCode);

  }, [accessCode.length == 0]);

  useEffect(() => {
  }, [])


  return (
    <div className={styles.homeContainer}>
      <div className={styles.container}>
        <div className={styles.column}>
          <div className={styles.dropOne}>
            <div className={styles.albumCover} />
          </div>
          <div style={{ height: "15px" }} />
          <div className={styles.songDescription}>
            <div className={styles.content}>
              <h1>Get Your Wish</h1>
              <h3 style={{ paddingLeft: "1px" }}>Porter Robinson</h3>
              <p style={{ paddingLeft: "1px", marginTop: "10px" }}>Benjamin Schiff Platt born September 24, 1993 is an American actor, singer, and songwriter. Platt, the son of film and theater producer Marc Platt, began his acting career in musical theater as a child and appeared in productions of The Sound of Music 2006 and The Book of Mormon 2012-2015, rising to prominence for originating the title role in Broadway coming-of-age musical Dear Evan Hansen 2015-2017.</p>
              <h2 style={{  marginTop: "15px" }}>Performed By</h2>
              <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
              <h2 style={{  marginTop: "15px" }}>Written By</h2>
              <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
            </div>
          </div>
        </div>
        <div className={styles.columnTwo}>
          <div className={styles.main}>

          </div>
          <div style={{ height: "15px"}} />
          <div className={styles.controls}>

          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.playlist}>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Home