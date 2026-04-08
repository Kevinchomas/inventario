import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Truck, CheckCircle, XCircle, MapPin, User, 
  Smartphone, Hash, ShoppingBag, Clock, Package, ChevronRight, AlertCircle 
} from 'lucide-react'

export default function GestionAlmacen() {
  const [pedidosAgrupados, setPedidosAgrupados] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [itemsCheckeados, setItemsCheckeados] = useState({})

  useEffect(() => {
    fetchYAgrupar()
    const channel = supabase
      .channel('cambios-almacen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => {
        fetchYAgrupar()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [filtro])

  const fetchYAgrupar = async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`
        *,
        inventario:inventario_id (
          id, talla, 
          productos:producto_id (nombre, codigo_ref, imagen_url)
        )
      `)
      .eq('status', filtro)
      .order('created_at', { ascending: false })

    if (error) return

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

    const resultado = Object.values(agrupados)
    setPedidosAgrupados(resultado)
    
    // Mantener la selección activa sincronizada
    if (pedidoSeleccionado) {
      const actualizado = resultado.find(p => p.id_grupo === pedidoSeleccionado.id_grupo)
      setPedidoSeleccionado(actualizado || null)
    }
  }

  const devolverStock = async (item) => {
    const { data: inv } = await supabase
      .from('inventario')
      .select('cantidad_disponible, cantidad_apartada')
      .eq('id', item.inventario_id)
      .single()

    if (inv) {
      await supabase
        .from('inventario')
        .update({
          cantidad_disponible: inv.cantidad_disponible + 1,
          cantidad_apartada: Math.max(0, inv.cantidad_apartada - 1)
        })
        .eq('id', item.inventario_id)
    }
  }

  const cancelarItem = async (item) => {
    if (!confirm("¿Quieres eliminar este modelo del pedido?")) return
    try {
      await devolverStock(item)
      await supabase.from('solicitudes').update({ status: 'cancelado' }).eq('id', item.id)
      
      // Actualización visual inmediata
      if (pedidoSeleccionado) {
        const nuevosItems = pedidoSeleccionado.items.filter(i => i.id !== item.id)
        if (nuevosItems.length === 0) {
          setPedidoSeleccionado(null)
        } else {
          setPedidoSeleccionado({ ...pedidoSeleccionado, items: nuevosItems })
        }
      }
      fetchYAgrupar()
    } catch (e) {
      console.error("Error al cancelar item individual:", e)
    }
  }

  const cancelarTodoElPedido = async (items) => {
    if (!confirm("¿ESTÁS SEGURO? Se cancelarán todos los zapatos de este cliente.")) return
    for (const item of items) {
      await devolverStock(item)
      await supabase.from('solicitudes').update({ status: 'cancelado' }).eq('id', item.id)
    }
    setPedidoSeleccionado(null)
    fetchYAgrupar()
  }

  const toggleCheck = (id) => {
    setItemsCheckeados(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const procesarAListo = async (items) => {
    const ids = items.map(i => i.id)
    const { error } = await supabase.from('solicitudes').update({ status: 'listo' }).in('id', ids)
    if (!error) {
      setPedidoSeleccionado(null)
      setItemsCheckeados({})
      fetchYAgrupar()
    }
  }

  // LÓGICA DE SALIDA INTELIGENTE: Solo pasa a entregado lo que NO sea apartado
  const procesarSalidaInteligente = async (items) => {
    const itemsParaDespacho = items.filter(i => i.tipo_solicitud === 'despacho');
    const itemsApartados = items.filter(i => i.tipo_solicitud === 'apartado');

    if (itemsParaDespacho.length === 0) {
      alert("Este pedido solo contiene APARTADOS. El almacenista los mantiene físicamente pero no se marcan como 'entregado' hasta que el vendedor los convierta en despacho.");
      return;
    }

    if (itemsApartados.length > 0) {
      if (!confirm(`Se marcarán ${itemsParaDespacho.length} como entregados. Los ${itemsApartados.length} apartados seguirán en esta lista para control. ¿Deseas continuar?`)) return;
    }

    const ids = itemsParaDespacho.map(i => i.id);
    const { error } = await supabase.from('solicitudes').update({ status: 'entregado' }).in('id', ids);
    
    if (!error) {
      setPedidoSeleccionado(null);
      setItemsCheckeados({});
      fetchYAgrupar();
    }
  }

  const todosCheckeados = pedidoSeleccionado?.items.every(item => itemsCheckeados[item.id])

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* PANEL IZQUIERDO */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-black text-slate-800 tracking-tighter mb-4 flex items-center gap-2 italic">
            <Package className="text-blue-600" /> CONTROL ALMACÉN
          </h1>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {['pendiente', 'listo', 'entregado'].map(f => (
              <button 
                key={f} 
                onClick={() => { setFiltro(f); setPedidoSeleccionado(null); }}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filtro === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pedidosAgrupados.map(p => (
            <div 
              key={p.id_grupo}
              onClick={() => setPedidoSeleccionado(p)}
              className={`p-4 rounded-3xl cursor-pointer transition-all border-2 relative ${pedidoSeleccionado?.id_grupo === p.id_grupo ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
            >
              {/* Notificación visual en lista si algún item fue modificado por vendedor */}
              {p.items.some(i => i.modificado_vendedor) && (
                <div className="absolute top-2 right-10 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse border-2 border-white"></div>
              )}
              <h3 className="font-black text-slate-800 text-xs uppercase pr-6 truncate">{p.cliente}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">ID Kommo: {p.kommo_id || '---'}</p>
              <div className="mt-2 inline-block bg-white px-3 py-0.5 rounded-full text-[9px] font-black border border-slate-200 text-blue-600">
                {p.items.length} {p.items.length === 1 ? 'PAR' : 'PARES'}
              </div>
              <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${pedidoSeleccionado?.id_grupo === p.id_grupo ? 'text-blue-500' : 'text-slate-300'}`} size={18} />
            </div>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        {pedidoSeleccionado ? (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Pedido Actual</p>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{pedidoSeleccionado.cliente}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Contacto</p>
                <p className="font-bold text-slate-700 flex items-center justify-end gap-2 text-sm">
                  <Smartphone size={16} className="text-blue-500" /> {pedidoSeleccionado.telefono}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {pedidoSeleccionado.items.map(item => (
                <div key={item.id} className={`bg-white rounded-[2.5rem] p-6 shadow-md border-2 flex gap-8 items-center transition-all ${item.modificado_vendedor ? 'border-orange-400 bg-orange-50/30' : 'border-slate-100'}`}>
                  <div className="w-40 h-40 bg-slate-50 rounded-[2rem] overflow-hidden flex-shrink-0 border border-slate-100">
                    <img src={item.inventario?.productos?.imagen_url} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-0.5 rounded-lg text-[9px] font-black uppercase ${item.tipo_solicitud === 'apartado' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                        {item.tipo_solicitud}
                      </span>
                      {item.modificado_vendedor && (
                        <span className="flex items-center gap-1 bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black animate-pulse">
                          <AlertCircle size={10} /> CAMBIO DE STATUS
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-300">REF: {item.inventario?.productos?.codigo_ref}</span>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-800 uppercase truncate mb-1">{item.inventario?.productos?.nombre}</h3>
                    <p className="text-blue-600 font-black text-sm mb-3 italic">TALLA {item.inventario?.talla}</p>
                    
                    <div className="space-y-1 border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-tight">
                        <Truck size={14} className="text-blue-500" /> 
                        {item.metodo_entrega || 'RETIRO EN TIENDA'}
                      </div>
                      <div className="flex items-start gap-2 text-slate-400 text-[10px] font-medium leading-tight">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-slate-300" /> 
                        <span className="italic">{item.cliente_direccion || item.direccion_envio || 'Sin dirección registrada'}</span>
                      </div>
                    </div>
                  </div>

                  {filtro !== 'entregado' && (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => cancelarItem(item)}
                        className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"
                        title="Eliminar este calzado"
                      >
                        <XCircle size={24} strokeWidth={2.5} />
                      </button>
                      
                      {filtro === 'pendiente' && (
                        <button 
                          onClick={() => toggleCheck(item.id)}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${itemsCheckeados[item.id] ? 'bg-emerald-500 border-emerald-200 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                        >
                          <CheckCircle size={24} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-3">
              {filtro === 'pendiente' && (
                <>
                  <button 
                    disabled={!todosCheckeados}
                    onClick={() => procesarAListo(pedidoSeleccionado.items)}
                    className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${todosCheckeados ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    {todosCheckeados ? 'MARCAR TODO COMO LISTO' : 'VERIFICA TODOS LOS CALZADOS PARA CONTINUAR'}
                  </button>
                  <button 
                    onClick={() => cancelarTodoElPedido(pedidoSeleccionado.items)}
                    className="w-full py-4 bg-transparent border-2 border-red-100 text-red-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
                  >
                    CANCELAR PEDIDO COMPLETO Y REGRESAR STOCK
                  </button>
                </>
              )}

              {filtro === 'listo' && (
                <>
                  <button 
                    onClick={() => procesarSalidaInteligente(pedidoSeleccionado.items)}
                    className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Truck size={20} /> CONFIRMAR SALIDA (SÓLO MODELOS DE ENVÍO)
                  </button>
                  <button 
                    onClick={() => cancelarTodoElPedido(pedidoSeleccionado.items)}
                    className="w-full py-4 bg-transparent border-2 border-red-100 text-red-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
                  >
                    CANCELAR Y DEVOLVER A INVENTARIO
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <ShoppingBag size={80} strokeWidth={1} className="opacity-10 mb-4" />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Selecciona un pedido para gestionar</p>
          </div>
        )}
      </div>
    </div>
  )
}