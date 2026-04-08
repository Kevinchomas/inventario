import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { UserPlus, Shield, Check, X, Loader2, Trash2, User } from 'lucide-react'

export default function UserManagement() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    usuario: '',
    password: '',
    rol: 'vendedor'
  })

  useEffect(() => {
    fetchUsuarios()
  }, [])

  async function fetchUsuarios() {
    setCargando(true)
    try {
      const { data, error } = await supabase.from('usuarios').select('*').order('nombre')
      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      setCargando(false)
    }
  }

  const obtenerPermisosBase = (rol) => {
    const esquemas = {
      admin: { ver_tienda: true, ver_almacen: true, ver_stock: true, ver_panel_carga: true, ver_gerencia: true },
      almacenista: { ver_tienda: false, ver_almacen: true, ver_stock: true, ver_panel_carga: false, ver_gerencia: false },
      vendedor: { ver_tienda: true, ver_almacen: false, ver_stock: false, ver_panel_carga: false, ver_gerencia: false }
    }
    return esquemas[rol] || esquemas.vendedor
  }

  const agregarUsuario = async (e) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    
    try {
      const permisosFinales = obtenerPermisosBase(nuevoUsuario.rol)

      // APLICADO: Mapeo correcto de columnas según tu base de datos
      const { error } = await supabase.from('usuarios').insert([{
        nombre: nuevoUsuario.nombre.trim(),
        usuario: nuevoUsuario.usuario.toLowerCase().trim(),
        contrasena: nuevoUsuario.password, // Cambiado de 'password' a 'contrasena'
        rol: nuevoUsuario.rol,
        permisos: permisosFinales 
      }])

      if (error) throw error

      setMostrarModal(false)
      setNuevoUsuario({ nombre: '', usuario: '', password: '', rol: 'vendedor' })
      await fetchUsuarios()
      
    } catch (error) {
      console.error("Error al crear:", error)
      alert("Error crítico: " + error.message)
    } finally {
      setEnviando(false)
    }
  }

  const togglePermiso = async (usuarioId, actualPermisos, clavePermiso) => {
    const base = actualPermisos || { ver_tienda: false, ver_almacen: false, ver_stock: false, ver_panel_carga: false }
    
    const nuevosPermisos = { 
      ...base, 
      [clavePermiso]: !base[clavePermiso] 
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ permisos: nuevosPermisos })
      .eq('id', usuarioId)

    if (error) {
      alert("Error actualizando permisos")
    } else {
      setUsuarios(usuarios.map(u => u.id === usuarioId ? { ...u, permisos: nuevosPermisos } : u))
    }
  }

  const eliminarUsuario = async (id) => {
    if (!confirm("¿Eliminar este acceso?")) return
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (!error) fetchUsuarios()
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Gestión de Equipo</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-[10px]">Accesos y permisos dinámicos</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 group"
        >
          <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Nuevo Integrante</span>
        </button>
      </div>

      <div className="space-y-4">
        {cargando ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          usuarios.map((u) => (
            <div key={u.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-4 hover:bg-white hover:shadow-md transition-all">
              <div className="flex items-center gap-4 min-w-[220px]">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 font-black">
                  {u.nombre?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase italic">{u.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">@{u.usuario}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                      u.rol === 'admin' ? 'bg-purple-100 text-purple-600' : 
                      u.rol === 'almacenista' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {u.rol}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PermisoBadge label="Tienda" activo={u.permisos?.ver_tienda} onClick={() => togglePermiso(u.id, u.permisos, 'ver_tienda')} />
                <PermisoBadge label="Almacén" activo={u.permisos?.ver_almacen} onClick={() => togglePermiso(u.id, u.permisos, 'ver_almacen')} />
                <PermisoBadge label="Stock" activo={u.permisos?.ver_stock} onClick={() => togglePermiso(u.id, u.permisos, 'ver_stock')} />
                <PermisoBadge label="Carga" activo={u.permisos?.ver_panel_carga} onClick={() => togglePermiso(u.id, u.permisos, 'ver_panel_carga')} />
                
                <button 
                  onClick={() => eliminarUsuario(u.id)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Registrar Acceso</h4>
              <button onClick={() => setMostrarModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={agregarUsuario} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Completo</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm font-bold transition-all" 
                  placeholder="Ej: Kevin Chacon" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Usuario</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm font-bold text-blue-600" 
                    placeholder="kevindev" value={nuevoUsuario.usuario} onChange={e => setNuevoUsuario({...nuevoUsuario, usuario: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
                  <input required type="password" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm font-bold" 
                    placeholder="••••" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Rol Asignado</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm font-black uppercase italic" 
                  value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}>
                  <option value="vendedor">Vendedor (Tienda)</option>
                  <option value="almacenista">Almacenista (Depósito)</option>
                  <option value="admin">Administrador (Total)</option>
                </select>
              </div>

              <button disabled={enviando} type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {enviando ? <Loader2 className="animate-spin" /> : 'Activar Acceso'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PermisoBadge({ label, activo, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
        activo 
        ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' 
        : 'bg-white border-slate-200 text-slate-400 opacity-50 hover:opacity-100'
      }`}
    >
      {label}: {activo ? 'SÍ' : 'NO'}
    </button>
  )
}