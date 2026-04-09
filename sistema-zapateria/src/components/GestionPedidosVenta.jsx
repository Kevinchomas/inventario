import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Clock, Package, Truck, Smartphone, 
  CheckCircle2, RefreshCw,
  ShoppingBag, X, Store, Layers,
  Hash, Tag
} from 'lucide-react'
import Button from './ui/Button'

export default function GestionPedidosVenta({ onVolver }) {
  const [pedidos, setPedidos] = useState([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [loading, setLoading] = useState(true)

  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false)
  const [itemsAProcesar, setItemsAProcesar] = useState([])
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
      .order('cliente_nombre', { ascending: true }) // Ordenar por nombre para facilitar sub-agrupación

    if (error) return console.error(error)

    const agrupados = data.reduce((acc, curr) => {
      const key = curr.kommo_id || 'sin-id'
      if (!acc[key]) {
        acc[key] = {
          id_grupo: key,
          kommo_id: curr.kommo_id,
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

  const prepararFinalizacion = (items) => {
    const lista = Array.isArray(items) ? items : [items]
    const soloApartados = lista.filter(i => i.tipo_solicitud === 'apartado')
    
    if (soloApartados.length === 0) return alert("No hay apartados pendientes por finalizar.")

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
      alert("Error: " + error.message)
    } else {
      setMostrarModalFinalizar(false)
      fetchPedidosActivos()
    }
  }

  const solicitarLiberacionAlmacen = async (item) => {
    if (!confirm("¿Solicitar al almacén que cancele este apartado?")) return
    await supabase.from('solicitudes').update({ 
      status: 'regresar al inventario',
      nota_almacen: `SOLICITUD VENTA: El vendedor ha cancelado el apartado.`
    }).eq('id', item.id)
    fetchPedidosActivos()
  }

  // Helper para agrupar items por nombre de cliente dentro del pedido seleccionado
  const agruparPorCliente = (items) => {
    return items.reduce((acc, item) => {
      const nombre = item.cliente_nombre || 'Sin nombre'
      if (!acc[nombre]) acc[nombre] = []
      acc[nombre].push(item)
      return acc
    }, {})
  }

  return (
    <div className="flex h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 font-sans relative">
      
      {/* PANEL IZQUIERDO */}
      <div className="w-[320px] border-r border-slate-50 flex flex-col bg-slate-50/10">
        <div className="p-6">
          <h1 className="text-xs font-black text-slate-800 tracking-tighter flex items-center gap-2 italic uppercase">
            <RefreshCw size={16} className="text-blue-600" /> Seguimiento Pedidos
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {pedidos.map(p => (
            <div 
              key={p.id_grupo} 
              onClick={() => setPedidoSeleccionado(p)} 
              className={`p-4 rounded-2xl cursor-pointer transition-all relative flex items-center gap-4 border ${pedidoSeleccionado?.id_grupo === p.id_grupo ? 'bg-white shadow-xl shadow-slate-200/60 border-blue-500 scale-[1.02]' : 'bg-white/40 border-transparent hover:bg-white/80'}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                <Hash size={10} className="text-blue-400 mb-0.5" />
                <span className="text-[11px] font-black text-white leading-none">{p.kommo_id ? p.kommo_id.toString().slice(-4) : '---'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-[13px] uppercase truncate tracking-tighter">ID: {p.kommo_id || 'SIN ID'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full shadow-sm ${p.items.every(i => i.status === 'listo') ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.items.length} Pares</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO (CON SUB-AGRUPACIÓN POR CLIENTE) */}
      <div className="flex-1 overflow-y-auto bg-white p-12">
        {pedidoSeleccionado ? (
          <div className="max-w-4xl mx-auto">
            {/* Header Principal del ID de Kommo */}
            <header className="mb-12 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Hash size={14} /> Gestión de Pedido Kommo: {pedidoSeleccionado.kommo_id || '---'}
                </p>
                <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
                  Consolidado de Entrega
                </h2>
              </div>
              <button 
                onClick={() => prepararFinalizacion(pedidoSeleccionado.items)}
                className="flex items-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 group"
              >
                <Layers size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[11px] font-black uppercase italic">Finalizar Todo</span>
              </button>
            </header>

            {/* Sub-agrupación por Cliente (Aquí está la magia) */}
            <div className="space-y-16">
              {Object.entries(agruparPorCliente(pedidoSeleccionado.items)).map(([nombreCliente, itemsCliente]) => (
                <div key={nombreCliente} className="space-y-6">
                  {/* Encabezado por Cliente */}
                  <div className="border-l-4 border-blue-600 pl-6 py-1">
                    <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase italic">Solicitado para:</span>
                    <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter mt-1">{nombreCliente}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                      <Smartphone size={12} /> {itemsCliente[0].cliente_telefono || 'Sin teléfono'}
                    </p>
                  </div>

                  {/* Lista de Calzados de ESTE cliente */}
                  <div className="grid grid-cols-1 gap-4">
                    {itemsCliente.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center gap-8 hover:shadow-md transition-shadow">
                        <div className="relative">
                          <img src={item.inventario?.productos?.imagen_url} className="w-28 h-28 rounded-[2rem] object-cover shadow-inner bg-slate-50 border border-slate-50" />
                          {item.status === 'listo' && (
                            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-4 border-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase shadow-sm ${item.status === 'listo' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                              {item.status === 'listo' ? 'Listo' : 'En espera'}
                            </span>
                            <span className="text-[8px] font-black px-3 py-1 rounded-lg uppercase bg-slate-100 text-slate-500 border border-slate-200/50 italic">
                              {item.tipo_solicitud}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-800 uppercase text-lg tracking-tighter">{item.inventario?.productos?.nombre}</h4>
                          <p className="text-[11px] font-bold text-slate-400 italic uppercase tracking-tighter">
                            Talla {item.inventario?.talla} <span className="mx-2 text-slate-200">|</span> REF: {item.inventario?.productos?.codigo_ref}
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                          {item.tipo_solicitud === 'apartado' && item.status === 'listo' ? (
                            <>
                              <Button onClick={() => prepararFinalizacion(item)} className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-[1.2rem] gap-3 min-w-[180px] shadow-lg shadow-slate-200">
                                <ShoppingBag size={18} /> <span className="text-[11px] font-black uppercase italic">Vender</span>
                              </Button>
                              <button onClick={() => solicitarLiberacionAlmacen(item)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors italic">
                                <X size={14} /> Liberar
                              </button>
                            </>
                          ) : (
                            <div className={`flex items-center gap-3 font-black text-[11px] uppercase italic px-8 py-4 rounded-[1.2rem] border-2 ${item.status === 'listo' ? 'text-emerald-500 bg-emerald-50/30 border-emerald-100' : 'text-slate-200 bg-slate-50 border-slate-100'}`}>
                              {item.status === 'listo' ? 'Listo para entrega' : 'Pendiente Almacén'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <Package size={100} strokeWidth={1} className="opacity-20 mb-8" />
            <p className="font-black uppercase tracking-[0.4em] text-[11px] text-slate-300">Selecciona un pedido de la lista</p>
          </div>
        )}
      </div>

      {/* MODAL FINALIZAR */}
      {mostrarModalFinalizar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Finalizar Venta</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Confirmar datos del cliente</p>
              </div>
              <button onClick={() => setMostrarModalFinalizar(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre del Cliente</label>
                <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">WhatsApp</label>
                  <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none" value={editForm.telefono} onChange={e => setEditForm({...editForm, telefono: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ID Kommo</label>
                  <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-slate-100 border text-sm font-bold outline-none" value={editForm.kommo_id} onChange={e => setEditForm({...editForm, kommo_id: e.target.value})} />
                </div>
              </div>
              <div className="flex p-2 bg-slate-100 rounded-[1.5rem] gap-1">
                <button onClick={() => setEditForm({...editForm, metodo: 'retiro'})} className={`flex-1 py-4 rounded-xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-2 ${editForm.metodo === 'retiro' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}><Store size={16}/> Retiro</button>
                <button onClick={() => setEditForm({...editForm, metodo: 'envio'})} className={`flex-1 py-4 rounded-xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-2 ${editForm.metodo === 'envio' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}><Truck size={16}/> Envío</button>
              </div>
              {editForm.metodo === 'envio' && (
                <div className="p-6 bg-blue-50/30 rounded-[2rem] border border-blue-100/50 space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Provincia" className="p-4 bg-white rounded-xl border-slate-100 border text-xs font-bold" value={editForm.provincia} onChange={e => setEditForm({...editForm, provincia: e.target.value})} />
                    <input type="text" placeholder="Ciudad" className="p-4 bg-white rounded-xl border-slate-100 border text-xs font-bold" value={editForm.ciudad} onChange={e => setEditForm({...editForm, ciudad: e.target.value})} />
                  </div>
                  <textarea placeholder="Dirección exacta..." className="w-full p-4 bg-white rounded-xl border-slate-100 border text-xs font-bold h-24 outline-none resize-none" value={editForm.direccion} onChange={e => setEditForm({...editForm, direccion: e.target.value})} />
                </div>
              )}
            </div>
            <div className="p-8 border-t bg-slate-50/50">
              <Button onClick={ejecutarFinalizacionVenta} className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-sm shadow-xl shadow-emerald-200">
                Confirmar y Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}