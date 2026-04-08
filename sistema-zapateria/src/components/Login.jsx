import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Lock, User } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    const { data, error: dbError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', username)
      .eq('contrasena', password)
      .single()

    if (data) {
      // CORRECCIÓN: Incluimos los permisos que vienen de la base de datos
      login({ 
        nombre: data.nombre, 
        rol: data.rol, 
        id: data.id, 
        permisos: data.permisos 
      })
    } else {
      setError('Credenciales incorrectas')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8">
        <div className="text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase italic">FANTASTICAS <span className="text-blue-600">SHOES</span></h1>
          <p className="text-slate-400 text-sm font-bold">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Usuario"
              className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-none font-bold focus:ring-4 focus:ring-blue-100"
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" 
              placeholder="Contraseña"
              className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-none font-bold focus:ring-4 focus:ring-blue-100"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-widest">{error}</p>}

          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
            Entrar al Sistema
          </button>
        </form>
      </div>
    </div>
  )
}