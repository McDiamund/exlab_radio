import React, { ReactNode, createContext, useContext, useState } from "react";

export const UserAPIContext = createContext();

export const UserProvider = (props) => {
    const [user, setUser] = useState({});

    const getUser = async (accessToken) => {

        const url = 'https://api.spotify.com/v1';

        const requestOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        };

        try {
            const response = await fetch(`${url}/me`, requestOptions);

            if (!response.ok) {
                throw new Error('Failed to get access token');
            }

            const data = await response.json();
            // Handle the response data here
            setUser(data);
        } catch (error) {
            // Handle errors here
            console.error('Error:', error);
        }
    }


    const ctx = {
        getUser,
        user
    }

    return (
        <UserAPIContext.Provider value={ctx}>
            {props.children}
        </UserAPIContext.Provider>
    );

}