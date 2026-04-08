import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // Añadimos un estado de carga

  useEffect(() => {
    const savedUser = localStorage.getItem('zapateria_sesion')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error("Error al cargar la sesión", e)
        localStorage.removeItem('zapateria_sesion')
      }
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('zapateria_sesion', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('zapateria_sesion')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)