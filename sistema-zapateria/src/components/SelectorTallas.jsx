import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext' // 1. Importamos el hook de autenticación

export default function SelectorTallas({ inventario, onUpdate, viewMode = 'vendedor' }) {
  const [procesando, setProcesando] = useState(null)
  const { user } = useAuth() // 2. Extraemos el usuario actual

  const manejarApartado = async (item) => {
    // Regla de Negocio: No procesar si no hay stock o ya se está cargando
    if (item.cantidad_disponible <= 0 || procesando) return
    
    setProcesando(item.id)
    
    // 3. Enviamos el nombre dinámico del vendedor a la función RPC
    const { error } = await supabase.rpc('fn_apartar_zapato_v2', {
      target_id: item.id,
      p_vendedor_nombre: user?.nombre || 'Vendedor Desconocido' 
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      // Sincronización Realtime: Notificamos al componente padre
      if (onUpdate) onUpdate()
    }
    setProcesando(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Stock por Talla
      </p>
      
      <div className="grid grid-cols-3 gap-2">
        {inventario.map((item) => {
          const sinStock = item.cantidad_disponible <= 0
          const estaProcesando = procesando === item.id
          
          return (
            <button
              key={item.id}
              disabled={sinStock || estaProcesando}
              onClick={() => viewMode === 'vendedor' && manejarApartado(item)}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200
                ${sinStock 
                  ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed' 
                  : 'bg-white border-slate-200 hover:border-brand-primary hover:shadow-md active:scale-95 cursor-pointer'}
                ${estaProcesando ? 'animate-pulse border-brand-primary ring-2 ring-brand-primary/20' : ''}
              `}
            >
              {/* Etiqueta de Talla */}
              <span className="text-[9px] font-black text-slate-400 mb-0.5">
                T{item.talla}
              </span>
              
              {/* Cantidad Disponible */}
              <span className={`text-sm font-black ${sinStock ? 'text-slate-300' : 'text-slate-700'}`}>
                {item.cantidad_disponible}
              </span>
              
              {/* Indicador visual de Apartados */}
              {item.cantidad_apartada > 0 && (
                <div className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-orange-500 border-2 border-white shadow-sm animate-in zoom-in">
                  <span className="text-[8px] font-black text-white">
                    {item.cantidad_apartada}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda rápida para el usuario */}
      {viewMode === 'vendedor' && (
        <p className="text-[9px] text-slate-400 italic text-center pt-1">
          Toca una talla para apartar el par
        </p>
      )}
    </div>
  )
}