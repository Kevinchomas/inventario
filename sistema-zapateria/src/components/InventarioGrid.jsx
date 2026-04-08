import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import ZapatoCard from './ZapatoCard'
import ModalGestionVenta from './ModalGestionVenta'
import Button from './ui/Button'
import { ShoppingCart, X, Plus, Store, Truck, User, Phone, MapPin, Hash, MessageSquare } from 'lucide-react'

export default function InventarioGrid({ refreshKey }) {
  const { user } = useAuth()
  const [zapatos, setZapatos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [filtroCat, setFiltroCat] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  // --- ESTADOS DE PEDIDO ---
  const [pedidoIniciado, setPedidoIniciado] = useState(false)
  const [mostrarModalInicio, setMostrarModalInicio] = useState(false)
  const [zapatoSeleccionado, setZapatoSeleccionado] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    cedula: '',
    kommo_id: '',
    metodo: 'retiro',
    provincia: '',
    ciudad: '',
    direccion: '',
    courier: 'Servientrega',
    nota_general: ''
  })

  useEffect(() => { fetchData() }, [refreshKey])

  async function fetchData() {
    setCargando(true)
    const { data: catData } = await supabase.from('categorias').select('*')
    setCategorias(catData || [])
    const { data: prodData } = await supabase.from('productos').select('*, categorias (id, nombre), inventario (*)')
    if (prodData) setZapatos(prodData)
    setCargando(false)
  }

  // CORRECCIÓN: Uso de prevCarrito para asegurar que múltiples llamadas 
  // en el mismo ciclo (forEach del modal) no sobrescriban el estado.
  const agregarAlCarrito = (zapato, itemInventario, configPersonalizada) => {
    setCarrito(prevCarrito => [
      ...prevCarrito, 
      {
        ...zapato,
        inventario_id: itemInventario.id,
        talla: itemInventario.talla,
        ...configPersonalizada
      }
    ])
    setZapatoSeleccionado(null) 
  }

  const finalizarPedidoEnBD = async () => {
    if (carrito.length === 0) return
    setEnviando(true)
    try {
      // 1. Preparar inserción masiva
      const nuevasSolicitudes = carrito.map(item => ({
        inventario_id: item.inventario_id,
        vendedor_nombre: user?.nombre || 'Vendedor Desconocido',
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono,
        cliente_cedula: cliente.cedula,
        kommo_id: cliente.kommo_id,
        status: 'pendiente', 
        tipo_solicitud: item.tipo_solicitud,
        metodo_entrega: item.metodo_entrega,
        cliente_direccion: item.cliente_direccion, 
        nota_almacen: item.nota_almacen || cliente.nota_general
      }))

      const { error } = await supabase.from('solicitudes').insert(nuevasSolicitudes)
      if (error) throw error

      // 2. Actualización de Stock
      // Optimizamos: Aunque sea un bucle, cada operación es independiente por ID de inventario
      for (const item of carrito) {
        const { data: inv } = await supabase
          .from('inventario')
          .select('cantidad_disponible')
          .eq('id', item.inventario_id)
          .single()

        if (inv) {
          await supabase.from('inventario').update({ 
            cantidad_disponible: Math.max(0, inv.cantidad_disponible - 1) 
          }).eq('id', item.inventario_id)
        }
      }

      alert(`¡Éxito! Se han procesado ${carrito.length} pares.`);
      resetTodo();
      fetchData();
    } catch (err) {
      alert("Error en el proceso: " + err.message)
    } finally {
      setEnviando(false)
    }
  }

  const resetTodo = () => {
    setPedidoIniciado(false)
    setCarrito([])
    setMostrarCarrito(false)
    setCliente({
      nombre: '', telefono: '', cedula: '', kommo_id: '',
      metodo: 'retiro', provincia: '', ciudad: '', direccion: '',
      courier: 'Servientrega', nota_general: ''
    })
  }

  const zapatosFiltrados = zapatos.filter(z => 
    (z.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || z.codigo_ref?.toLowerCase().includes(busqueda.toLowerCase())) &&
    (filtroCat === 'todos' || z.categoria_id == filtroCat)
  )

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* HEADER DE ACCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-3xl ${pedidoIniciado ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            <User size={24} />
          </div>
          <div>
            <h2 className="font-black text-xl uppercase italic tracking-tighter text-slate-800">
              {pedidoIniciado ? cliente.nombre : 'Panel de Ventas'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {pedidoIniciado ? `ID KOMMO: ${cliente.kommo_id || 'N/A'} • ${cliente.metodo}` : 'Inicia un pedido para habilitar el catálogo'}
            </p>
          </div>
        </div>
        
        {!pedidoIniciado ? (
          <Button onClick={() => setMostrarModalInicio(true)} className="bg-slate-900 hover:bg-black text-white px-8 rounded-2xl gap-2 h-14">
            <Plus size={20} /> <span className="uppercase text-xs font-black">Iniciar Nuevo Pedido</span>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setMostrarCarrito(true)} variant="secondary" className="border-emerald-100 text-emerald-600 gap-2">
               <ShoppingCart size={18} /> Carrito ({carrito.length})
            </Button>
            <Button onClick={() => { if(confirm("¿Cancelar pedido?")) resetTodo() }} variant="secondary" className="text-red-500 border-red-50 px-4">
              <X size={18} />
            </Button>
          </div>
        )}
      </div>

      {/* FILTROS */}
      <div className="flex gap-4">
        <input 
          type="text" 
          placeholder="Buscar zapato..." 
          className="flex-1 p-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold outline-none focus:ring-2 ring-blue-500/20"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select 
          className="p-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold outline-none"
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
        >
          <option value="todos">Categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {zapatosFiltrados.map(z => (
          <ZapatoCard 
            key={z.id} 
            zapato={z} 
            pedidoIniciado={pedidoIniciado} 
            onAbrirGestion={(z) => setZapatoSeleccionado(z)}
          />
        ))}
      </div>

      {/* MODAL GESTIÓN INDIVIDUAL */}
      {zapatoSeleccionado && (
        <ModalGestionVenta 
          zapato={zapatoSeleccionado}
          datosBaseCliente={cliente}
          carritoActual={carrito}
          onClose={() => setZapatoSeleccionado(null)}
          onAgregar={agregarAlCarrito}
        />
      )}

      {/* MODAL INICIO (DATOS CLIENTE) */}
      {mostrarModalInicio && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase italic">Datos del Cliente</h2>
              <button onClick={() => setMostrarModalInicio(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <input type="text" placeholder="Nombre completo *" className="w-full p-4 rounded-2xl bg-slate-50 border text-sm font-bold outline-none" value={cliente.nombre} onChange={e => setCliente({...cliente, nombre: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Teléfono *" className="p-4 rounded-2xl bg-slate-50 border text-sm font-bold outline-none" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} />
                <input type="text" placeholder="Kommo ID" className="p-4 rounded-2xl bg-slate-50 border text-sm font-bold outline-none" value={cliente.kommo_id} onChange={e => setCliente({...cliente, kommo_id: e.target.value})} />
              </div>
              <div className="flex p-2 bg-slate-100 rounded-2xl">
                <button onClick={() => setCliente({...cliente, metodo: 'retiro'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${cliente.metodo === 'retiro' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Store size={14} className="inline mr-1"/> Retiro</button>
                <button onClick={() => setCliente({...cliente, metodo: 'envio'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${cliente.metodo === 'envio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Truck size={14} className="inline mr-1"/> Envío</button>
              </div>
              {cliente.metodo === 'envio' && (
                <div className="p-4 bg-slate-50 rounded-3xl border space-y-3">
                   <select className="w-full p-3 bg-white rounded-xl border text-xs font-bold" value={cliente.courier} onChange={e => setCliente({...cliente, courier: e.target.value})}>
                     <option value="Servientrega">Servientrega</option>
                     <option value="LarCourier">LarCourier</option>
                   </select>
                   <div className="grid grid-cols-2 gap-2">
                     <input type="text" placeholder="Provincia" className="p-3 bg-white rounded-xl border text-xs font-bold" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} />
                     <input type="text" placeholder="Ciudad" className="p-3 bg-white rounded-xl border text-xs font-bold" value={cliente.ciudad} onChange={e => setCliente({...cliente, ciudad: e.target.value})} />
                   </div>
                   <textarea placeholder="Dirección detallada..." className="w-full p-3 bg-white rounded-xl border text-xs font-bold h-20 outline-none" value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} />
                </div>
              )}
            </div>
            <div className="p-6 border-t">
              <Button onClick={() => { if(!cliente.nombre || !cliente.telefono) return alert("Faltan datos"); setPedidoIniciado(true); setMostrarModalInicio(false); }} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">Comenzar Pedido</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CARRITO */}
      {mostrarCarrito && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-xl uppercase italic">Tu Carrito ({carrito.length})</h2>
              <button onClick={() => setMostrarCarrito(false)}><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {carrito.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">El carrito está vacío</p>
              ) : (
                carrito.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-[2rem] border relative">
                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${item.tipo_solicitud === 'apartado' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                    <img src={item.imagen_url} className="w-16 h-16 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <h4 className="text-xs font-black uppercase truncate">{item.nombre}</h4>
                      <p className="text-[10px] font-bold text-blue-600">Talla {item.talla} • {item.tipo_solicitud}</p>
                      <p className="text-[8px] text-slate-400 truncate uppercase">{item.cliente_direccion}</p>
                    </div>
                    <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} className="text-red-400"><X size={18}/></button>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t">
              <Button disabled={enviando || carrito.length === 0} onClick={finalizarPedidoEnBD} className="w-full py-5 bg-emerald-600 text-white font-black uppercase text-xs">
                {enviando ? 'Enviando...' : `Confirmar y Enviar (${carrito.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}