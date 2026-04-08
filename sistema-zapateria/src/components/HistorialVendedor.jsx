import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Package, Clock, CheckCircle, Truck, Edit3, Trash2 } from 'lucide-react'

export default function HistorialVendedor() {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPedidos()
  }, [user])

  async function fetchPedidos() {
    if (!user) return
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`
        *,
        inventario (
          talla,
          zapatos (nombre, codigo_ref)
        )
      `)
      .eq('vendedor_nombre', user.nombre)
      .neq('estado', 'entregado') // No mostrar lo que ya se cerró
      .order('created_at', { ascending: false })

    if (!error) setPedidos(data)
    setLoading(false)
  }

  const getStatusBadge = (estado) => {
    const styles = {
      pendiente: "bg-orange-100 text-orange-600",
      listo: "bg-blue-100 text-blue-600",
      enviado: "bg-emerald-100 text-emerald-600",
      cancelado: "bg-red-100 text-red-600"
    }
    return `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${styles[estado] || 'bg-slate-100'}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 uppercase italic">Mis Pedidos</h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pedidos.length} Activos</span>
      </div>

      <div className="grid gap-3">
        {pedidos.map(pedido => (
          <div key={pedido.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                {pedido.tipo_solicitud === 'apartado' ? <Clock size={20} /> : <Package size={20} />}
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm leading-none mb-1">
                  {pedido.inventario?.zapatos?.nombre} (T{pedido.inventario?.talla})
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Cliente: {pedido.cliente_nombre}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={getStatusBadge(pedido.estado || 'pendiente')}>
                {pedido.estado || 'pendiente'}
              </span>
              
              {/* ACCIONES PARA FERNANDA */}
              <div className="flex gap-1">
                {pedido.estado === 'pendiente' && (
                  <>
                    <button className="p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-colors" title="Editar / Completar datos">
                      <Edit3 size={18} />
                    </button>
                    <button className="p-2 hover:bg-red-50 text-red-400 rounded-xl transition-colors" title="Cancelar Pedido">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}