import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Clock, Package, Truck, Smartphone, 
  ChevronLeft, CheckCircle2, RefreshCw,
  ShoppingBag, X, User, Store, MapPin, Layers
} from 'lucide-react'
import Button from './ui/Button'

export default function GestionPedidosVenta({ onVolver }) {
  const [pedidos, setPedidos] = useState([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [loading, setLoading] = useState(true)

  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false)
  const [itemsAProcesar, setItemsAProcesar] = useState([]) // Cambiado a array para soportar uno o varios
  const [editForm, setEditForm] = useState({
    nombre: '', telefono: '', kommo_id: '',
    metodo: 'retiro', courier: 'Servientrega',
    provincia: '', ciudad: '', direccion: ''
  })

  useEffect(() => {
    fetchPedidosActivos()
    const channel = supabase
      .channel('cambios-ventas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => {
        fetchPedidosActivos()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchPedidosActivos = async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`
        *,
        inventario:inventario_id (
          id, talla, 
          productos:producto_id (nombre, codigo_ref, imagen_url)
        )
      `)
      .in('status', ['pendiente', 'listo'])
      .order('created_at', { ascending: false })

    if (error) return console.error(error)

    const agrupados = data.reduce((acc, curr) => {
      const key = `${curr.cliente_nombre}-${curr.kommo_id}`
      if (!acc[key]) {
        acc[key] = {
          id_grupo: key,
          cliente: curr.cliente_nombre,
          kommo_id: curr.kommo_id,
          telefono: curr.cliente_telefono,
          items: []
        }
      }
      acc[key].items.push(curr)
      return acc
    }, {})

    const listaAgrupada = Object.values(agrupados)
    setPedidos(listaAgrupada)
    
    if (pedidoSeleccionado) {
      const actualizado = listaAgrupada.find(p => p.id_grupo === pedidoSeleccionado.id_grupo)
      if (actualizado) setPedidoSeleccionado(actualizado)
    }
    setLoading(false)
  }

  // Lógica para abrir modal (Individual o Grupal)
  const prepararFinalizacion = (items) => {
    const lista = Array.isArray(items) ? items : [items]
    // Solo filtramos los que son 'apartado'
    const soloApartados = lista.filter(i => i.tipo_solicitud === 'apartado')
    
    if (soloApartados.length === 0) return alert("No hay apartados pendientes por finalizar en esta selección.")

    setItemsAProcesar(soloApartados)
    const base = soloApartados[0]
    setEditForm({
      nombre: base.cliente_nombre || '',
      telefono: base.cliente_telefono || '',
      kommo_id: base.kommo_id || '',
      metodo: 'retiro',
      courier: 'Servientrega',
      provincia: '', ciudad: '',
      direccion: ''
    })
    setMostrarModalFinalizar(true)
  }

  const ejecutarFinalizacionVenta = async () => {
    if (!editForm.nombre || !editForm.telefono) return alert("Nombre y teléfono obligatorios")
    
    const ids = itemsAProcesar.map(i => i.id)
    const fullDireccion = editForm.metodo === 'envio' 
      ? `${editForm.courier} - ${editForm.provincia}, ${editForm.ciudad}. ${editForm.direccion}`
      : 'Retiro en tienda'

    const { error } = await supabase
      .from('solicitudes')
      .update({
        cliente_nombre: editForm.nombre,
        cliente_telefono: editForm.telefono,
        kommo_id: editForm.kommo_id,
        metodo_entrega: editForm.metodo,
        cliente_direccion: fullDireccion,
        status: 'pendiente',
        tipo_solicitud: 'venta de apartado'
      })
      .in('id', ids)

    if (error) {
      alert("Error al actualizar: " + error.message)
    } else {
      setMostrarModalFinalizar(false)
      fetchPedidosActivos()
    }
  }

  const solicitarLiberacionAlmacen = async (item) => {
    const confirmar = confirm("¿Solicitar al almacén que cancele este apartado?")
    if (!confirmar) return
    await supabase.from('solicitudes').update({ 
      status: 'regresar al inventario',
      nota_almacen: `SOLICITUD VENTA: El vendedor ha cancelado el apartado.`
    }).eq('id', item.id)
    fetchPedidosActivos()
  }

  return (
    <div className="flex h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 font-sans relative">
      
      {/* PANEL IZQUIERDO */}
      <div className="w-[320px] border-r border-slate-50 flex flex-col bg-slate-50/20">
        <div className="p-6">

          <h1 className="text-xs font-black text-slate-800 tracking-tighter flex items-center gap-2 italic uppercase">
            <RefreshCw size={16} className="text-blue-600" /> Pedidos en curso
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {pedidos.map(p => (
            <div key={p.id_grupo} onClick={() => setPedidoSeleccionado(p)} className={`p-4 rounded-2xl cursor-pointer transition-all relative flex items-center gap-3 border ${pedidoSeleccionado?.id_grupo === p.id_grupo ? 'bg-white shadow-lg shadow-slate-200/50 border-blue-500' : 'bg-white/40 border-transparent hover:bg-white/80 hover:border-slate-100'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><User size={18} /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-[10px] uppercase truncate">{p.cliente}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: #{p.kommo_id || '000'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.items.every(i => i.status === 'listo') ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.items.length} Pares</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 overflow-y-auto bg-white p-12">
        {pedidoSeleccionado ? (
          <div className="max-w-3xl mx-auto">
            <header className="mb-10 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Detalle del pedido</p>
                <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{pedidoSeleccionado.cliente}</h2>
                <p className="text-[11px] font-bold text-slate-400 mt-3 uppercase tracking-widest">
                  Whatsapp: {pedidoSeleccionado.telefono} | ID: {pedidoSeleccionado.kommo_id || '---'}
                </p>
              </div>
              
              {/* BOTÓN GLOBAL */}
              <button 
                onClick={() => prepararFinalizacion(pedidoSeleccionado.items)}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                <Layers size={16} />
                <span className="text-[10px] font-black uppercase italic">Finalizar Todos Apartados</span>
              </button>
            </header>

            <div className="space-y-6">
              {pedidoSeleccionado.items.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-8 shadow-sm">
                  <img src={item.inventario?.productos?.imagen_url} className="w-24 h-24 rounded-3xl object-cover shadow-inner bg-slate-50" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase ${item.status === 'listo' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{item.status === 'listo' ? 'Listo' : 'En espera'}</span>
                      <span className="text-[8px] font-black px-3 py-1 rounded-lg uppercase bg-slate-100 text-slate-500">{item.tipo_solicitud}</span>
                    </div>
                    <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.inventario?.productos?.nombre}</h4>
                    <p className="text-[10px] font-bold text-slate-400 italic uppercase">Talla {item.inventario?.talla} • REF: {item.inventario?.productos?.codigo_ref}</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    {item.tipo_solicitud === 'apartado' && item.status === 'listo' ? (
                      <>
                        <Button onClick={() => prepararFinalizacion(item)} className="h-12 px-6 bg-[#0f172a] hover:bg-black text-white rounded-2xl gap-2 min-w-[160px]">
                          <ShoppingBag size={16} /> <span className="text-[10px] font-black uppercase italic">Finalizar Venta</span>
                        </Button>
                        <button onClick={() => solicitarLiberacionAlmacen(item)} className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors italic">
                          <X size={14} /> Liberar Zapato
                        </button>
                      </>
                    ) : (
                      <div className={`flex items-center gap-2 font-black text-[10px] uppercase italic px-6 py-3 rounded-2xl border ${item.status === 'listo' ? 'text-emerald-500 bg-emerald-50/50 border-emerald-100/50' : 'text-slate-300 bg-slate-50 border-slate-100'}`}>
                        {item.status === 'listo' ? <><CheckCircle2 size={16} /> Listo para salida</> : <><Clock size={16} /> En espera</>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <Package size={80} strokeWidth={1} className="opacity-10 mb-6" />
            <p className="font-black uppercase tracking-[0.4em] text-[10px]">Selecciona un cliente de la lista</p>
          </div>
        )}
      </div>

      {/* MODAL CON COURIERS RESTAURADOS */}
      {mostrarModalFinalizar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                {itemsAProcesar.length > 1 ? `Finalizar ${itemsAProcesar.length} ventas` : 'Completar Venta'}
              </h2>
              <button onClick={() => setMostrarModalFinalizar(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nombre del Cliente</label>
                <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none focus:ring-2 ring-blue-500/20" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Teléfono</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none" value={editForm.telefono} onChange={e => setEditForm({...editForm, telefono: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">ID Kommo</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none" value={editForm.kommo_id} onChange={e => setEditForm({...editForm, kommo_id: e.target.value})} />
                </div>
              </div>

              <div className="flex p-2 bg-slate-100 rounded-2xl gap-1">
                <button onClick={() => setEditForm({...editForm, metodo: 'retiro'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${editForm.metodo === 'retiro' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Store size={14}/> Retiro</button>
                <button onClick={() => setEditForm({...editForm, metodo: 'envio'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${editForm.metodo === 'envio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Truck size={14}/> Envío</button>
              </div>

              {editForm.metodo === 'envio' && (
                <div className="p-4 bg-blue-50/30 rounded-3xl border border-blue-100/50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex p-1 bg-white/50 rounded-xl gap-1">
                    <button onClick={() => setEditForm({...editForm, courier: 'Servientrega'})} className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase transition-all ${editForm.courier === 'Servientrega' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400'}`}>Servientrega</button>
                    <button onClick={() => setEditForm({...editForm, courier: 'Larcourier'})} className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase transition-all ${editForm.courier === 'Larcourier' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400'}`}>Larcourier</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Provincia" className="p-3 bg-white rounded-xl border-slate-100 border text-xs font-bold" value={editForm.provincia} onChange={e => setEditForm({...editForm, provincia: e.target.value})} />
                    <input type="text" placeholder="Ciudad" className="p-3 bg-white rounded-xl border-slate-100 border text-xs font-bold" value={editForm.ciudad} onChange={e => setEditForm({...editForm, ciudad: e.target.value})} />
                  </div>
                  <textarea placeholder="Dirección detallada..." className="w-full p-3 bg-white rounded-xl border-slate-100 border text-xs font-bold h-20 outline-none resize-none" value={editForm.direccion} onChange={e => setEditForm({...editForm, direccion: e.target.value})} />
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50/50">
              <Button onClick={ejecutarFinalizacionVenta} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-200/50 transition-all active:scale-[0.98]">
                Confirmar y Finalizar Venta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}