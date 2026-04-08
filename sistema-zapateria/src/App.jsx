import { useState, useEffect } from 'react'
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
  const [vistaActual, setVistaActual] = useState('') 
  const { user, logout } = useAuth() 

  const tienePermiso = (nombrePermiso) => {
    if (user?.rol === 'admin') return true;
    return user?.permisos?.[nombrePermiso] || false;
  }

  useEffect(() => {
    if (user && !vistaActual) {
      if (tienePermiso('ver_tienda')) setVistaActual('inventario');
      else if (tienePermiso('ver_almacen')) setVistaActual('almacen');
      else if (tienePermiso('ver_stock')) setVistaActual('stock');
      else if (tienePermiso('ver_panel_carga')) setVistaActual('carga');
      else if (tienePermiso('ver_gerencia')) setVistaActual('gerencia');
    }
  }, [user, vistaActual]);

  if (!user) return <Login />

  const notificarCambio = () => setRefreshKey(prev => prev + 1)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* HEADER CON NAVEGACIÓN INTEGRADA */}
      {/* HEADER CON NAVEGACIÓN DESPLAZADA A LA DERECHA */}
<header className="bg-white border-b sticky top-0 z-50 shadow-sm h-16 shrink-0">
  <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
    
    {/* LADO IZQUIERDO: Logo solo */}
    <h1 className="text-lg font-black text-blue-600 tracking-tighter uppercase shrink-0">
      FANTASTICAS<span className="text-slate-400 ml-0.5">SHOES</span>
    </h1>

    {/* LADO DERECHO: Menú + Info de Usuario */}
    <div className="flex items-center gap-6">
      
      {/* NAV DE ESCRITORIO (Ahora aquí a la derecha) */}
      <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl gap-1">
        {tienePermiso('ver_tienda') && (
          <HeaderLink active={vistaActual === 'inventario'} onClick={() => setVistaActual('inventario')} icon={<LayoutGrid size={16} />} label="Tienda" />
        )}
        {tienePermiso('ver_almacen') && (
          <HeaderLink active={vistaActual === 'almacen'} onClick={() => setVistaActual('almacen')} icon={<Warehouse size={16} />} label="Almacén" />
        )}
        {tienePermiso('ver_stock') && (
          <HeaderLink active={vistaActual === 'stock'} onClick={() => setVistaActual('stock')} icon={<BarChart3 size={16} />} label="Stock" />
        )}
        {tienePermiso('ver_panel_carga') && (
          <HeaderLink active={vistaActual === 'carga'} onClick={() => setVistaActual('carga')} icon={<PlusCircle size={16} />} label="Carga" />
        )}
        {tienePermiso('ver_gerencia') && (
          <HeaderLink active={vistaActual === 'gerencia'} onClick={() => setVistaActual('gerencia')} icon={<Settings size={16} />} label="Gerencia" activeColor="bg-purple-600" />
        )}
      </nav>

      {/* SEPARADOR VISUAL OPCIONAL */}
      <div className="hidden lg:block w-px h-8 bg-slate-200 mx-2"></div>

      {/* INFO USUARIO */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {user?.rol === 'admin' ? 'Administrador' : user?.rol || 'Personal'}
          </span>
          <span className="text-sm font-bold text-slate-700">{user?.nombre || 'Usuario'}</span>
        </div>
        <button 
          onClick={logout}
          className="p-2.5 bg-slate-100 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>

    </div>
  </div>
</header>

      {/* CONTENEDOR PRINCIPAL ESTABILIZADO */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 overflow-x-hidden">
        
        {vistaActual === 'inventario' && tienePermiso('ver_tienda') && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <h2 className="text-2xl font-black italic">¡Hola, {user?.nombre?.split(' ')[0]}!</h2>
                <p className="text-blue-100 text-sm opacity-90">Gestión de ventas en tiempo real.</p>
             </div>
             <InventarioGrid refreshKey={refreshKey} onUpdate={notificarCambio} />
          </div>
        )}

        {vistaActual === 'almacen' && tienePermiso('ver_almacen') && (
          <div className="animate-in fade-in duration-300 min-h-[600px]">
             <GestionAlmacen />
          </div>
        )}

        {vistaActual === 'stock' && tienePermiso('ver_stock') && (
          <div className="animate-in fade-in duration-300">
             <InventarioGeneral />
          </div>
        )}

        {vistaActual === 'carga' && tienePermiso('ver_panel_carga') && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <section className="md:col-span-5"><FormularioCategoria onCategoriaCreada={notificarCambio} /></section>
              <section className="md:col-span-7"><FormularioCarga key={refreshKey} alGuardar={notificarCambio} /></section>
            </div>
          </div>
        )}

        {vistaActual === 'gerencia' && tienePermiso('ver_gerencia') && (
          <div className="animate-in fade-in duration-300">
             <PanelGerente />
          </div>
        )}
      </main>
    </div>
  )
}

// NUEVO COMPONENTE DE BOTÓN PARA EL HEADER
function HeaderLink({ active, onClick, icon, label, activeColor = "bg-blue-600" }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
        active 
          ? `${activeColor} text-white shadow-sm` 
          : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
      }`}
    >
      {icon}
      <span className="uppercase tracking-tighter">{label}</span>
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