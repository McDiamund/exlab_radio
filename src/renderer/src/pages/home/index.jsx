import { useContext, useEffect, useRef, useState } from 'react';
import styles from './home.module.css';
import albumCover from '../../assets/cover.jpeg';
import { AuthContext } from '../../contexts/auth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { UserAPIContext } from '../../contexts/user_api';
import { SongAPIContext } from '../../contexts/song_api';
import Track from '../../components/track';



const Home = () => {
  const [pixelColor, setPixelColor] = useState({ one: "#3c899a", two: "#78a3b9", three: "#acbfd3" });
  const [query, setQuery] = useState("");

  const { getAuthToken, accessCode } = useContext(AuthContext);
  const { getUser, user } = useContext(UserAPIContext);
  const { songResults, setSongResults, albumResults, setAlbumResults, searchQuery } = useContext(SongAPIContext);

  useEffect(() => {

    getAuthToken();
    
    console.log(accessCode);

  }, [accessCode.length == 0]);

  function dragBottomLeftSection() {

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

        // console.log({bottomHeight: rectHeight, windowHeight: window.innerHeight, diff: (window.innerHeight - rectHeight), newHeight: newHeight});

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

  }

  function dragCenterSection() {

    const controls = document.getElementById('controls');
    const resizableElement = document.getElementById('main');
    const resizeHandle = document.getElementById('resizeHandleCenter');

    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;

      const onMouseMove = (e) => {
        if (!isResizing) return;

        const rectWidth = resizableElement.getBoundingClientRect().left;
        const rectHeight = resizableElement.getBoundingClientRect().top;

        const newWidth = e.clientX - rectWidth;
      
        const newHeight = (e.clientY);

        // console.log({bottomHeight: rectHeight, windowHeight: window.innerHeight, diff: (window.innerHeight - rectHeight), newHeight: newHeight});

        resizableElement.style.width = `${newWidth}px`;

        controls.style.height = "calc(100% - "+ newHeight + 'px';
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

  }

  useEffect(() => {
    dragBottomLeftSection();
    dragCenterSection();
  }, []);

  const handleSearch = async (e) => {
    if (e.target.value == "") {
      setQuery("");
      setSongResults([])
      setAlbumResults([])
      return;
    }

    setQuery(e.target.value);
    searchQuery(e.target.value, accessCode);
  }

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
              <ArrowOutwardIcon id="resizeHandle" className={styles.resizeHandle} style={{ color: "white", marginRight: "-7px", marginTop: "-6px"}} />
            </div>
          </div>
          <div className={styles.columnTwo}>
            <div id="main" className={styles.main}>
              {/* <div className={styles.title_bar}>
                <h2 style={{ paddingLeft: "1px" }}>Playlists</h2>
                <div style={{ flexGrow: 1 }} />'
                <FormatListBulletedIcon style={{ color: "white", fontSize: "40px" }}/>
                <AddIcon style={{ color: "white", fontSize: "40px" }} />
              </div> */}
              <div className={styles.searchBar}>
                <SearchIcon style={{ color: "white" }}/>
                <input 
                  type='text'
                  className={styles.searchInput}
                  value={query}
                  onChange={handleSearch}
                  placeholder='Search for a song...'
                />
                <div onClick={() =>  {
                  setQuery('');
                  setSongResults([]);
                  setAlbumResults([]);
                }} style={{ cursor: "pointer"}}>
                  <CloseIcon style={{ color: "white" }} />
                </div>
              </div>
              <div className={styles.searchResults}>

                  {query.length > 0 && albumResults.length > 0 && 
                  <h2 className={styles.searchTitle}>Albums</h2>}
                <div className={styles.albumsList}>
                  {query.length > 0 && albumResults.map((track) => (
                    <Track track={track}  />
                  ))}
                </div>

                {query.length > 0 && songResults.length > 0 && 
                <h2 className={styles.searchTitle}>Songs</h2>}
                {query.length > 0 && songResults.map((track) => (
                  <Track track={track}  />
                ))}
              </div>
              <div className={styles.main_playlist_covers}>
                {/* <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover} />
                <div className={styles.cover}>
                  <AddIcon style={{ color: "white", fontSize: "50px" }} />
                </div> */}
              </div>
              <div style={{ flexGrow: 1 }} />
              <div style={{ display: "flex", justifyContent: "right" }}>
                <ArrowOutwardIcon id="resizeHandleCenter" className={styles.resizeHandle} style={{ color: "white", transform: "rotate(90deg)", marginRight: "-15px", marginBottom: "-10px"}} />
              </div>
            </div>
            <div id="controls" className={styles.controls}>
               
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