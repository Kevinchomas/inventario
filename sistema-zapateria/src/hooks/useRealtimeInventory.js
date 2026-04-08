import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRealtimeInventory(productoId = null) {
  const [data, setData] = useState([])

  useEffect(() => {
    // Suscripción al canal de cambios en la tabla inventario
    const channel = supabase
      .channel('cambios-inventario')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'inventario' }, 
          (payload) => {
            // Aquí disparamos la actualización lógica
            fetchInventory()
          }
      )
      .subscribe()

    fetchInventory()

    return () => { supabase.removeChannel(channel) }
  }, [productoId])

  async function fetchInventory() {
    let query = supabase.from('inventario').select('*')
    if (productoId) query = query.eq('producto_id', productoId)
    const { data: inv } = await query
    setData(inv || [])
  }

  return data
}