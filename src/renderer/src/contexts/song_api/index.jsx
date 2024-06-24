import React, { ReactNode, createContext, useContext, useState } from "react";

export const SongAPIContext = createContext();

export const SongProvider = (props) => {
    const [playlists, setPlaylists] = useState('');
    const [songResults, setSongResults] = useState([]);
    const [albumResults, setAlbumResults] = useState([]);
    const [playlistResult, setPlaylistResult] = useState(null);

    const searchQuery = async (query, access_token) => {
        try {
            let response = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                query
              )}&type=album%2Ctrack`,
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
              }
            );
    
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
    
            let data = await response.json();
            
            setSongResults(data.tracks.items);
            setAlbumResults(data.albums.items);
          } catch (error) {
            console.log(error);
          }
    }

    const getAlbum = async (id, access_token) => {
      try {
          let response = await fetch(
            `https://api.spotify.com/v1/albums/${encodeURIComponent(
              id
            )}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          );
  
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
  
          let data = await response.json();
          console.log(data);
          
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