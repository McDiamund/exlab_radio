import { useContext, useEffect, useRef, useState } from 'react';
import styles from './home.module.css';
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
  const [albumCover, setAlbumCover] = useState('../../assets/cover.jpeg');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [isSearching, setSearching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState("");
  const audioRef = useRef(null);

  const { getUser, user } = useContext(UserAPIContext);
  const {
    songResults,
    setSongResults,
    albumResults,
    setAlbumResults,
    searchQuery,
    getAlbum,
    playlistResult,
    setPlaylistResult
  } = useContext(SongAPIContext);

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
    searchQuery(e.target.value);
  }

  const toggleSearch = () => {
    setSearching(!isSearching);
  }

  const parseTrackInfo = (track) => {
    let name = track.name;
    let artist = track.artists.map((artist) => artist.name).join(', ')

    return [name, artist]
  }

  const playTrack = async (track) => {
    if (track.album) {
      setAlbumCover(track.album.images[0].url);
    } else {
      setAlbumCover(playlistResult.images[0].url);
    }
    setAlbumTitle(track.name);
    setAlbumArtist(track.artists.map((artist) => artist.name).join(', '));
  }
  // Home Page Functionality

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

        dropOne.style.height = "calc(100% - " + newHeight + 'px';
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

        controls.style.height = "calc(100% - " + newHeight + 'px';
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

  return (
    <div className={styles.homeContainer} style={{ backgroundImage: `linear-gradient(to right bottom, ${pixelColor.one}, ${pixelColor.two}, ${pixelColor.three}, #ffffff, #ffffff)` }}>
      <div className={styles.container}>
        <div className={styles.left_content}>
          <div className={styles.column}>
            <div id='dropOne' className={styles.dropOne} style={{ backgroundImage: `url(${albumCover})` }} />
            <div id='dropTwo' className={styles.dropTwo}>
              <div className={styles.content} style={{ width: "100%"}}>
                <h1>{albumTitle}</h1>
                <h3 style={{ paddingLeft: "1px" }}>{albumArtist}</h3>
                <p style={{ paddingLeft: "1px", marginTop: "10px" }}>Benjamin Schiff Platt born September 24, 1993 is an American actor, singer, and songwriter. Platt, the son of film and theater producer Marc Platt, began his acting career in musical theater as a child and appeared in productions of The Sound of Music 2006 and The Book of Mormon 2012-2015, rising to prominence for originating the title role in Broadway coming-of-age musical Dear Evan Hansen 2015-2017.</p>
                <h2 style={{ marginTop: "15px" }}>Performed By</h2>
                <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
                <h2 style={{ marginTop: "15px" }}>Written By</h2>
                <p style={{ paddingLeft: "1px" }}>Porter Robinson</p>
              </div>
              <ArrowOutwardIcon id="resizeHandle" className={styles.resizeHandle} style={{ color: "white", marginRight: "-7px", marginTop: "-6px" }} />
            </div>
          </div>
          <div className={styles.columnTwo}>
            <div id="main" className={styles.main}>
              {!isSearching &&
                <div className={styles.main_navigation}>
                  <h1>Good Morning, Elias</h1>
                  <div style={{ flexGrow: 1 }} />
                  <div style={{ display: "flex" }}>
                    <div className={styles.main_search} onClick={toggleSearch}>
                      <SearchIcon style={{ color: "white" }} />
                      <h3>Search for a song</h3>
                    </div>
                  </div>
                </div>
              }
              {isSearching &&
                <>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div className={styles.searchBar}>
                      <SearchIcon style={{ color: "white" }} />
                      <input
                        type='text'
                        className={styles.searchInput}
                        value={query}
                        onChange={handleSearch}
                        placeholder='Search for a song...'
                      />
                      <div onClick={() => {
                        setQuery('');
                        setSongResults([]);
                        setAlbumResults([]);
                      }} style={{ cursor: "pointer" }}>
                        <CloseIcon style={{ color: "white" }} />
                      </div>
                    </div>
                    <div onClick={() => {
                      setQuery('');
                      setSongResults([]);
                      setAlbumResults([]);
                      toggleSearch();
                    }} style={{ cursor: "pointer", marginTop: "7px" }}>
                      <p style={{ color: "white" }}>Back</p>
                    </div>
                  </div>
                  <div className={styles.searchResults}>
                    {query.length > 0 && albumResults.length > 0 &&
                      <h2 className={styles.searchTitle}>Albums</h2>}
                    <div className={styles.albumsList}>
                      {query.length > 0 && albumResults.map((track) => (
                        <Track track={track} />
                      ))}
                    </div>

                    {query.length > 0 && songResults.length > 0 &&
                      <h2 className={styles.searchTitle}>Songs</h2>}
                    {query.length > 0 && songResults.map((track) => (
                      <div onClick={() => playTrack(track)}>
                        <Track track={track} />
                      </div>
                    ))}
                  </div>
                </>
              }
              {!isSearching &&
                <>
                  <div className={styles.title_bar}>
                    <h2 style={{ paddingLeft: "1px" }}>Playlists</h2>
                    <div style={{ flexGrow: 1 }} />
                    <div style={{ cursor: "pointer" }}>
                      <SearchIcon style={{ color: "white", fontSize: "40px" }} />
                    </div>
                    <FormatListBulletedIcon style={{ color: "white", fontSize: "40px" }} />
                    <AddIcon style={{ color: "white", fontSize: "40px" }} />
                  </div>
                  <div className={styles.main_playlist_covers}>
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
                    <div className={styles.cover} />
                    <div className={styles.cover}>
                      <AddIcon style={{ color: "white", fontSize: "50px" }} />
                    </div>
                  </div>
                </>}
              <div style={{ flexGrow: 1 }} />
              <div style={{ display: "flex", justifyContent: "right", padding: "10px" }}>
                <ArrowOutwardIcon id="resizeHandleCenter" className={styles.resizeHandle} style={{ color: "white", transform: "rotate(90deg)", marginRight: "-15px", marginBottom: "-10px" }} />
              </div>
            </div>
            <div id="controls" className={styles.controls}>
              {audioURL && <audio ref={audioRef} controls src={audioURL} />}
            </div>
          </div>
        </div>
        <div id="container" className={styles.columnThree}>
          <div className={styles.playlist}>
            {playlistResult != null &&
              <>
                <div className={styles.playlist_info}>
                  <img className={styles.playlist_cover} src={playlistResult.images[0].url} />
                  <span className={styles.playlist_title}>
                    <h2>{playlistResult.name}</h2>
                    <h3>{playlistResult.artists.map((artist) => artist.name).join(', ')}</h3>
                  </span>
                </div>
                <div className={styles.playlist_tracks}>
                  {playlistResult.tracks.items.map((track) => (
                    <div onClick={() => playTrack(track)}>
                      <Track track={track} cover={playlistResult.images[0].url} />
                    </div>
                  ))}
                </div>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home