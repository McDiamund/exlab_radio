import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./contexts/auth"
import Home from "./pages/home"

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App