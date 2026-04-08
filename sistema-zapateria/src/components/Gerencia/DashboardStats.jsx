import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { DollarSign, Package, AlertCircle, TrendingUp } from 'lucide-react'

export default function DashboardStats() {
  const [stats, setStats] = useState({ ventas: 0, stockBajo: 0, pedidosPendientes: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    // 1. Contar pedidos pendientes
    const { count: pendientes } = await supabase
      .from('solicitudes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendiente')

    // 2. Contar productos con stock bajo (ejemplo < 3 unidades)
    const { count: bajo } = await supabase
      .from('inventario')
      .select('*', { count: 'exact', head: true })
      .lt('cantidad_disponible', 3)

    setStats({
      pedidosPendientes: pendientes || 0,
      stockBajo: bajo || 0,
      ventas: 0 // Aquí podrías sumar el total de la tabla solicitudes en el futuro
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard 
        title="Pedidos en Espera" 
        value={stats.pedidosPendientes} 
        icon={<Package className="text-blue-600" />} 
        color="bg-blue-50" 
      />
      <StatCard 
        title="Alertas de Stock" 
        value={stats.stockBajo} 
        icon={<AlertCircle className="text-orange-600" />} 
        color="bg-orange-50" 
        subtitle="Menos de 3 unidades"
      />
      <StatCard 
        title="Rendimiento" 
        value="Activo" 
        icon={<TrendingUp className="text-emerald-600" />} 
        color="bg-emerald-50" 
      />
    </div>
  )
}

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <div className={`p-8 rounded-[2.5rem] ${color} border border-white shadow-sm relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="p-3 bg-white w-fit rounded-2xl shadow-sm mb-4">{icon}</div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
        <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
        {subtitle && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{subtitle}</p>}
      </div>
    </div>
  )
}