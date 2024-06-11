import { useContext, useEffect, useRef, useState } from 'react';
import styles from './home.module.css';
import albumCover from '../../assets/cover.jpeg';
import { AuthContext } from '../../contexts/auth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AddIcon from '@mui/icons-material/Add';



const Home = () => {
  const [pixelColor, setPixelColor] = useState({ one: "#3c899a", two: "#78a3b9", three: "#acbfd3" });

  const { getAuthToken, accessCode } = useContext(AuthContext);

  useEffect(() => {

    getAuthToken();

    console.log(accessCode);

  }, [accessCode.length == 0]);

  useEffect(() => {

    const dropOne = document.getElementById('dropOne');
    const resizableElement = document.getElementById('dropTwo');
    const resizeHandle = document.getElementById('resizeHandle');

    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;

      const onMouseMove = (e) => {
        if (!isResizing) return;

        const rectWidth = resizableElement.getBoundingClientRect().left;
        const rectHeight = resizableElement.getBoundingClientRect().bottom;

        const newWidth = e.clientX - rectWidth;
      
        const newHeight = (window.innerHeight - e.clientY) - (window.innerHeight - rectHeight);

        console.log({bottomHeight: rectHeight, windowHeight: window.innerHeight, diff: (window.innerHeight - rectHeight), newHeight: newHeight});

        resizableElement.style.width = `${newWidth}px`;

        dropOne.style.height = "calc(100% - "+ newHeight + 'px';
        resizableElement.style.height = `${newHeight}px`;
      };

      const onMouseUp = () => {
        isResizing = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }, []);

  return (
    <div className={styles.homeContainer} style={{ backgroundImage: `linear-gradient(to right bottom, ${pixelColor.one}, ${pixelColor.two}, ${pixelColor.three}, #ffffff, #ffffff)`}}>
      <div className={styles.container}>
        <div className={styles.left_content}>
          <div className={styles.column}>
            <div id='dropOne' className={styles.dropOne} style={{ backgroundImage: `url(${albumCover})` }} />
            <div id='dropTwo' className={styles.dropTwo}>
              <div className={styles.content}>
                <h1>Get Your Wish</h1>
                <h3 style={{ paddingLeft: "1px" }}>Porter Robinson</h3>
                <p style={{ paddingLeft: "1px", marginTop: "10px" }}>Benjamin Schiff Platt born September 24, 1993 is an American actor, singer, and songwriter. Platt, the son of film and theater producer Marc Platt, began his acting career in musical theater as a child and appeared in productions of The Sound of Music 2006 and The Book of Mormon 2012-2015, rising to prominence for originating the title role in Broadway coming-of-age musical Dear Evan Hansen 2015-2017.</p>
                <h2 style={{ marginTop: "15px" }}>Performed By</h2>
                <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
                <h2 style={{ marginTop: "15px" }}>Written By</h2>
                <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
              </div>
              <div id='resizeHandle' class={styles.resizeHandle} />
            </div>
          </div>
          <div className={styles.columnTwo}>
            <div className={styles.main}>
              <div className={styles.title_bar}>
                <h2 style={{ paddingLeft: "1px" }}>Playlists</h2>
                <div style={{ flexGrow: 1 }} />'
                <FormatListBulletedIcon style={{ color: "white", fontSize: "30px" }}/>
                <AddIcon style={{ color: "white", fontSize: "30px" }} />
              </div>
              <div className={styles.main_playlist_covers}>
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
           
              </div>
            </div>
            <div style={{ height: "15px" }} />
            <div className={styles.controls}>

            </div>
          </div>
        </div>
        <div className={styles.columnThree}>
          <div className={styles.playlist}>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Home