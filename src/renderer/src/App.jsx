import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./contexts/auth"
import Home from "./pages/home"
import Header from "./components/header"

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App