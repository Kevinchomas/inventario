import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext' // 1. Importamos el hook de autenticación
import { X, Plus, Minus, ShoppingCart, Clock, Store, Truck, MessageSquare } from 'lucide-react'
import Button from './ui/Button'

export default function ModalGestionVenta({ zapato, onClose, onUpdate }) {
  const [tab, setTab] = useState('apartado') 
  const [seleccion, setSeleccion] = useState({})
  const [cargando, setCargando] = useState(false)
  const [mostrarNotas, setMostrarNotas] = useState(false)
  
  const { user } = useAuth() // 2. Extraemos el usuario actual de la sesión

  const [cliente, setCliente] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    kommo_id: '',
    metodo: 'retiro',
    provincia: '',
    ciudad: '',
    direccion: '',
    courier: 'Servientrega',
    nota_vendedor: ''
  })

  const ajustarCantidad = (id, delta, max) => {
    const actual = seleccion[id] || 0
    const nueva = actual + delta
    if (nueva >= 0 && nueva <= max) {
      setSeleccion({ ...seleccion, [id]: nueva })
    }
  }

  const procesarAccion = async () => {
    const itemsParaProcesar = Object.entries(seleccion).filter(([_, cant]) => cant > 0)
    if (itemsParaProcesar.length === 0) return alert("Selecciona al menos una talla")
    if (!cliente.nombre) return alert("Nombre del cliente es obligatorio")

    setCargando(true)
    try {
      for (const [invId, cantidad] of itemsParaProcesar) {
        // 3. Insertar la solicitud con el nombre dinámico del vendedor
        const { error: errorSolicitud } = await supabase.from('solicitudes').insert({
          inventario_id: invId,
          tipo_solicitud: tab === 'apartado' ? 'apartado' : 'despacho',
          // Usamos el nombre del usuario de la sesión, o un fallback por seguridad
          vendedor_nombre: user?.nombre || 'Vendedor Desconocido', 
          cliente_nombre: cliente.nombre,
          cliente_cedula: cliente.cedula,
          cliente_telefono: cliente.telefono,
          cliente_direccion: cliente.metodo === 'envio' 
            ? `${cliente.courier}: ${cliente.provincia}, ${cliente.ciudad}. ${cliente.direccion}`
            : 'RETIRO EN TIENDA',
          kommo_id: cliente.kommo_id,
          metodo_entrega: tab === 'apartado' ? 'sin entrega' : cliente.metodo,
          nota_almacen: cliente.nota_vendedor 
        })

        if (errorSolicitud) throw errorSolicitud

        const itemInventario = zapato.inventario.find(i => i.id === invId)
        const nuevoStock = itemInventario.cantidad_disponible - cantidad

        const { error: errorStock } = await supabase
          .from('inventario')
          .update({ cantidad_disponible: nuevoStock })
          .eq('id', invId)

        if (errorStock) throw errorStock
      }

      alert("¡Procesado! El stock se ha actualizado correctamente.")
      onUpdate() 
      onClose()
    } catch (err) {
      alert("Error en proceso: " + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9900] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">{zapato.nombre}</h2>
            <p className="text-[10px] font-bold text-brand-primary uppercase">REF: {zapato.codigo_ref}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20} /></button>
        </div>

        {/* TABS */}
        <div className="flex p-2 bg-slate-100 mx-6 mt-4 rounded-2xl">
          <button onClick={() => setTab('apartado')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${tab === 'apartado' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
            <Clock size={14} /> Apartar
          </button>
          <button onClick={() => setTab('vendido')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${tab === 'vendido' ? 'bg-brand-primary text-green-600 shadow-lg' : 'text-slate-500'}`}>
            <ShoppingCart size={14} /> Venta Directa
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* TALLAS Y STOCK */}
          <div className="grid gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase block">Disponibilidad Actual</label>
            {zapato.inventario.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-black text-slate-700 text-sm uppercase">Talla {item.talla}</span>
                  <span className={`text-[9px] font-bold italic ${item.cantidad_disponible <= 2 ? 'text-red-500' : 'text-slate-400'}`}>
                    Quedan: {item.cantidad_disponible}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="secondary" className="!w-9 !h-9 !p-0 !rounded-full" onClick={() => ajustarCantidad(item.id, -1, item.cantidad_disponible)}>
                    <Minus size={16} strokeWidth={3} />
                  </Button>
                  <span className="font-black text-lg w-4 text-center text-brand-dark">{seleccion[item.id] || 0}</span>
                  <Button variant="primary" className="!w-9 !h-9 !p-0 !rounded-full" disabled={(seleccion[item.id] || 0) >= item.cantidad_disponible} onClick={() => ajustarCantidad(item.id, 1, item.cantidad_disponible)}>
                    <Plus size={16} strokeWidth={3} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* DATOS CLIENTE */}
          <div className="space-y-3">
            <input type="text" placeholder="Nombre Completo" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:ring-2 ring-brand-primary" onChange={(e) => setCliente({...cliente, nombre: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Cédula/RIF" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" onChange={(e) => setCliente({...cliente, cedula: e.target.value})} />
              <input type="text" placeholder="Teléfono" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" onChange={(e) => setCliente({...cliente, telefono: e.target.value})} />
            </div>
            <input type="text" placeholder="ID Kommo CRM" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" onChange={(e) => setCliente({...cliente, kommo_id: e.target.value})} />
          </div>

          {/* NOTAS DEL VENDEDOR */}
          <button 
            onClick={() => setMostrarNotas(!mostrarNotas)}
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-brand-primary transition-colors"
          >
            <MessageSquare size={14} /> {mostrarNotas ? 'Ocultar Notas' : 'Añadir Nota/Comentario'}
          </button>
          
          {mostrarNotas && (
            <textarea 
              placeholder="Ej: El cliente paga al recibir, caja un poco maltratada..." 
              className="w-full p-4 rounded-2xl bg-yellow-50/50 border border-yellow-100 text-xs font-bold h-20 outline-none animate-in fade-in duration-300"
              onChange={(e) => setCliente({...cliente, nota_vendedor: e.target.value})}
            />
          )}

          {/* FLUJO DE ENVÍO */}
          {tab === 'vendido' && (
            <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCliente({...cliente, metodo: 'retiro'})} className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${cliente.metodo === 'retiro' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-100 text-slate-400'}`}>
                  <Store size={18} /><span className="text-xs font-black uppercase">Retiro</span>
                </button>
                <button onClick={() => setCliente({...cliente, metodo: 'envio'})} className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${cliente.metodo === 'envio' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-100 text-slate-400'}`}>
                  <Truck size={18} /><span className="text-xs font-black uppercase">Envío</span>
                </button>
              </div>

              {cliente.metodo === 'envio' && (
                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-3 animate-in zoom-in duration-300">
                  <select className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold outline-none" onChange={(e) => setCliente({...cliente, courier: e.target.value})}>
                    <option value="Servientrega">Servientrega</option>
                    <option value="LarCourier">LarCourier</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Provincia" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold outline-none" onChange={(e) => setCliente({...cliente, provincia: e.target.value})} />
                    <input type="text" placeholder="Ciudad" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold outline-none" onChange={(e) => setCliente({...cliente, ciudad: e.target.value})} />
                  </div>
                  <textarea placeholder="Dirección detallada" className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold h-16 outline-none" onChange={(e) => setCliente({...cliente, direccion: e.target.value})} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t border-slate-100">
          <Button 
            variant={tab === 'apartado' ? 'secondary' : 'primary'} 
            className={`w-full py-5 text-xs uppercase tracking-widest font-black ${tab === 'apartado' ? 'bg-orange-50 border-none text-orange-600 hover:bg-orange-800 hover:text-dark shadow-none' : ''}`}
            disabled={cargando}
            onClick={procesarAccion}
          >
            {cargando ? 'Procesando...' : tab === 'apartado' ? 'Confirmar Apartado y Bajar Stock' : 'Confirmar Venta y Bajar Stock'}
          </Button>
        </div>
      </div>
    </div>
  )
}