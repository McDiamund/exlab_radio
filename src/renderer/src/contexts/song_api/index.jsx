import React, { ReactNode, createContext, useContext, useState } from "react";
import { BASE_URL } from "../../util/utils";

export const SongAPIContext = createContext();

export const SongProvider = (props) => {
    const [playlists, setPlaylists] = useState('');
    const [songResults, setSongResults] = useState([]);
    const [albumResults, setAlbumResults] = useState([]);
    const [playlistResult, setPlaylistResult] = useState(null);

    const searchQuery = async (query) => {
      let url = `${BASE_URL}/search?query=${query}`
      try {
        let response = await fetch(url);
        if (!response.ok) {
          throw new Error(response.json().error)
        }
        let data = await response.json();
        setSongResults(data.tracks);
        setAlbumResults(data.albums);
      } catch (error) {
        console.log(error);
      }
    }

    const getAlbum = async (id) => {
      let url = `${BASE_URL}/album?id=${id}`
      try {
        let response = await fetch(url);
        if (!response.ok) {
          throw new Error(response.json().error)
        }
        let data = await response.json();
        setPlaylistResult(data);
      } catch (error) {
        console.log(error);
      }
    }

    const ctx = {
        playlists,
        songResults,
        albumResults,
        playlistResult,
        getAlbum,
        searchQuery,
        setSongResults,
        setAlbumResults,
        setPlaylistResult
    }

    return (
        <SongAPIContext.Provider value={ctx}>
            {props.children}
        </SongAPIContext.Provider>
    );

}