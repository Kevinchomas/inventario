import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Clock } from 'lucide-react'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('solicitudes')
        .select(`
          created_at,
          vendedor_nombre,
          status,
          inventario(talla, productos(nombre))
        `)
        .order('created_at', { ascending: false })
        .limit(5)
      setLogs(data || [])
    }
    fetchLogs()
  }, [])

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="text-blue-400" size={20} />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Actividad Reciente</h3>
      </div>
      
      <div className="space-y-4">
        {logs.map((log, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex flex-col">
              <span className="text-xs font-bold">{log.vendedor_nombre} solicitó un {log.inventario?.productos?.nombre}</span>
              <span className="text-[10px] text-slate-500 uppercase font-black">Talla {log.inventario?.talla}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
              log.status === 'pendiente' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {log.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}