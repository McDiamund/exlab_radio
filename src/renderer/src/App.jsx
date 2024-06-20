import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./contexts/auth"
import Home from "./pages/home"
import Header from "./components/header"
import { UserProvider } from "./contexts/user_api"
import { SongProvider } from "./contexts/song_api"

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <SongProvider>
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </SongProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App