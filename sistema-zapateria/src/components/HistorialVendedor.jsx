import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Package, Clock, CheckCircle, Truck, Edit3, Trash2, AlertCircle } from 'lucide-react'

export default function HistorialVendedor() {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPedidos()
  }, [user])

  async function fetchPedidos() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`
        *,
        inventario (
          id,
          talla,
          zapatos (nombre, codigo_ref)
        )
      `)
      .eq('vendedor_nombre', user.nombre)
      .neq('estado', 'entregado') // Filtramos los cerrados
      .order('created_at', { ascending: false })

    if (!error) setPedidos(data)
    setLoading(false)
  }

  const cancelarPedido = async (pedido) => {
    if (!confirm(`¿Estás seguro de cancelar el pedido de ${pedido.cliente_nombre}? El stock se devolverá al inventario.`)) return

    try {
      // Usamos una función RPC o actualizamos el estado. 
      // Nota: Si tienes un trigger en la DB, solo con actualizar a 'cancelado' bastaría.
      const { error } = await supabase
        .from('solicitudes')
        .update({ estado: 'cancelado' })
        .eq('id', pedido.id)

      if (error) throw error
      
      alert("Pedido cancelado exitosamente")
      fetchPedidos()
    } catch (err) {
      alert("Error al cancelar: " + err.message)
    }
  }

  const getStatusBadge = (estado) => {
    const styles = {
      pendiente: "bg-orange-100 text-orange-600 border-orange-200",
      listo: "bg-blue-100 text-blue-600 border-blue-200",
      enviado: "bg-emerald-100 text-emerald-600 border-emerald-200",
      cancelado: "bg-red-100 text-red-600 border-red-200"
    }
    return `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${styles[estado] || 'bg-slate-100 border-slate-200'}`
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="animate-spin mb-4"><Package size={40} /></div>
      <p className="text-xs font-black uppercase tracking-widest">Cargando tus pedidos...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Mis Pedidos</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Seguimiento en tiempo real</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
          <span className="text-xs font-black">{pedidos.length}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Activos</span>
        </div>
      </div>

      <div className="grid gap-4">
        {pedidos.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-16 text-center">
            <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No tienes pedidos pendientes</p>
          </div>
        ) : (
          pedidos.map(pedido => (
            <div key={pedido.id} className="group bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-colors ${
                  pedido.estado === 'pendiente' ? 'bg-orange-50 text-orange-400' : 'bg-blue-50 text-blue-400'
                }`}>
                  {pedido.tipo_solicitud === 'apartado' ? <Clock size={24} /> : <Package size={24} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">
                      {pedido.inventario?.zapatos?.codigo_ref || 'REF-INC'}
                    </span>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                      {pedido.inventario?.zapatos?.nombre} <span className="text-blue-500 italic ml-1">(T{pedido.inventario?.talla})</span>
                    </h3>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      Cliente: <span className="text-slate-900">{pedido.cliente_nombre}</span>
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                      <Truck size={10} /> {pedido.metodo_entrega === 'envio' ? `Envío a ${pedido.ciudad}` : 'Retiro en Tienda'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                <span className={getStatusBadge(pedido.estado || 'pendiente')}>
                  {pedido.estado || 'pendiente'}
                </span>
                
                <div className="flex gap-2">
                  {pedido.estado === 'pendiente' && (
                    <>
                      <button 
                        onClick={() => cancelarPedido(pedido)}
                        className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all duration-300 shadow-sm" 
                        title="Cancelar Pedido"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  {/* Botón de ver detalle (opcional) */}
                  <button className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all duration-300 shadow-sm">
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}