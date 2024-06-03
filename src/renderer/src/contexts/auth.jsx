// import { createContext, useState } from "react";

import React, { ReactNode, createContext, useContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = (props) => {
  const [accessCode, setAccessCode] = useState('');

  const getAuthToken = async () => {

      const url = 'https://accounts.spotify.com/api';

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'grant_type': 'client_credentials',
          'client_id': '2f05a3c27f93476e8d6825b9bad854c2',
          'client_secret': '8da80fa617a040eab3645afb98564b72',
        })
      };

      try {
        const response = await fetch(`${url}/token`, requestOptions);

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }
        
        const data = await response.json();
        // Handle the response data here
        setAccessCode(data.access_token);
      } catch (error) {
          // Handle errors here
          console.error('Error:', error);
      }

  }

  const ctx = {
    getAuthToken,
    accessCode
  }

  return (
    <AuthContext.Provider value={ctx}>
      { props.children }
    </AuthContext.Provider>
  );
}

