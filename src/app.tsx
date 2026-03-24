import React, { JSX, useState } from 'react'
import Dashboard from './pages/dashboard'
import { SongProvider } from './contexts/SongContext'

function App(): JSX.Element {

  return (
    <SongProvider>
      <Dashboard />
    </SongProvider>
  )
}

export default App