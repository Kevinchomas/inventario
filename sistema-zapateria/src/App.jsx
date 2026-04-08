import { useState, useEffect } from 'react' // Añadido useEffect
import { AuthProvider, useAuth } from './context/AuthContext' 
import Login from './components/Login' 
import FormularioCarga from './components/FormularioCarga'
import FormularioCategoria from './components/FormularioCategoria'
import InventarioGrid from './components/InventarioGrid'
import GestionAlmacen from './components/GestionAlmacen'
import InventarioGeneral from './components/InventarioGeneral' 
import PanelGerente from './components/Gerencia';
import { LayoutGrid, Warehouse, PlusCircle, BarChart3, Settings, LogOut } from 'lucide-react'

function AppContent() {
  const [refreshKey, setRefreshKey] = useState(0)
  // Estado inicial vacío para manejar la redirección por permisos
  const [vistaActual, setVistaActual] = useState('') 
  const { user, logout } = useAuth() 

  // --- LÓGICA DE PERMISOS DINÁMICOS ---
  const tienePermiso = (nombrePermiso) => {
    if (user?.rol === 'admin') return true;
    return user?.permisos?.[nombrePermiso] || false;
  }

  // EFECTO DE REDIRECCIÓN: Evita que usuarios sin 'ver_tienda' vean pantalla en blanco al entrar
  useEffect(() => {
    if (user && !vistaActual) {
      if (tienePermiso('ver_tienda')) setVistaActual('inventario');
      else if (tienePermiso('ver_almacen')) setVistaActual('almacen');
      else if (tienePermiso('ver_stock')) setVistaActual('stock');
      else if (tienePermiso('ver_panel_carga')) setVistaActual('carga');
      else if (tienePermiso('ver_gerencia')) setVistaActual('gerencia');
    }
  }, [user, vistaActual]);

  if (!user) {
    return <Login />
  }

  const notificarCambio = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900 font-sans">
      
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter uppercase">
            FANTASTICAS<span className="text-slate-400 ml-0.5">SHOES</span>
          </h1>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {user?.rol === 'admin' ? 'Administrador' : user?.rol || 'Personal'}
              </span>
              <span className="text-xs font-bold text-slate-700">{user?.nombre || 'Usuario'}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
        
        {/* VISTA 1: TIENDA */}
        {vistaActual === 'inventario' && tienePermiso('ver_tienda') && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl overflow-hidden relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-1 italic tracking-tighter">
                  ¡Hola, {user?.nombre?.split(' ')[0] || 'Usuario'}!
                </h2>
                <p className="text-blue-100 opacity-80 text-sm font-medium">Gestiona tus modelos y registra ventas en tiempo real.</p>
              </div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full opacity-10 blur-3xl"></div>
            </div>
            <InventarioGrid refreshKey={refreshKey} onUpdate={notificarCambio} />
          </div>
        )}

        {/* VISTA 2: ALMACÉN */}
        {vistaActual === 'almacen' && tienePermiso('ver_almacen') && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <GestionAlmacen />
          </div>
        )}

        {/* VISTA 3: CONTROL DE STOCK */}
        {vistaActual === 'stock' && tienePermiso('ver_stock') && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
             <InventarioGeneral />
          </div>
        )}

        {/* VISTA 4: PANEL DE CARGA */}
        {vistaActual === 'carga' && tienePermiso('ver_panel_carga') && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Configuración</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Carga de nuevos modelos y tallas</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <section className="md:col-span-5">
                <FormularioCategoria onCategoriaCreada={notificarCambio} />
              </section>
              <section className="md:col-span-7">
                <FormularioCarga key={refreshKey} alGuardar={notificarCambio} />
              </section>
            </div>
          </div>
        )}

        {/* VISTA 5: PANEL DE GERENCIA */}
        {vistaActual === 'gerencia' && tienePermiso('ver_gerencia') && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
             <PanelGerente />
          </div>
        )}
      </main>

      {/* NAVEGACIÓN GLOBAL DINÁMICA */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0f172a] backdrop-blur-xl px-3 py-2 rounded-[2.5rem] flex items-center gap-1 shadow-2xl z-[1000] border border-white/10">
        
        {tienePermiso('ver_tienda') && (
          <NavButton 
            active={vistaActual === 'inventario'} 
            onClick={() => setVistaActual('inventario')} 
            icon={<LayoutGrid size={18} strokeWidth={2.5} />} 
            label="Tienda" 
          />
        )}

        {tienePermiso('ver_almacen') && (
          <NavButton 
            active={vistaActual === 'almacen'} 
            onClick={() => setVistaActual('almacen')} 
            icon={<Warehouse size={18} strokeWidth={2.5} />} 
            label="Almacén" 
          />
        )}

        {tienePermiso('ver_stock') && (
          <NavButton 
            active={vistaActual === 'stock'} 
            onClick={() => setVistaActual('stock')} 
            icon={<BarChart3 size={18} strokeWidth={2.5} />} 
            label="Stock" 
            color="bg-emerald-500"
          />
        )}

        {tienePermiso('ver_panel_carga') && (
          <NavButton 
            active={vistaActual === 'carga'} 
            onClick={() => setVistaActual('carga')} 
            icon={<PlusCircle size={18} strokeWidth={2.5} />} 
            label="Panel" 
            color="bg-white text-slate-900"
          />
        )}

        {tienePermiso('ver_gerencia') && (
          <>
            <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
            <NavButton 
              active={vistaActual === 'gerencia'} 
              onClick={() => setVistaActual('gerencia')} 
              icon={<Settings size={18} strokeWidth={2.5} />} 
              label="Gerencia" 
              color="bg-purple-600"
            />
          </>
        )}
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, icon, label, color = "bg-blue-600" }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
        active ? `${color} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon}
      {active && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
    </button>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}