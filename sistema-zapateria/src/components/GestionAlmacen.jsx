import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Truck, CheckCircle, XCircle, MapPin, User, 
  Smartphone, Hash, ShoppingBag, Clock, Package, ChevronRight, AlertCircle, RefreshCcw, X
} from 'lucide-react'

export default function GestionAlmacen() {
  const [pedidosAgrupados, setPedidosAgrupados] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [itemsCheckeados, setItemsCheckeados] = useState({})
  const [imagenExpandida, setImagenExpandida] = useState(null)

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
    let query = supabase
      .from('solicitudes')
      .select(`
        *,
        inventario:inventario_id (
          id, talla, 
          productos:producto_id (nombre, codigo_ref, imagen_url)
        )
      `)

    if (filtro === 'pendiente') {
      query = query.in('status', ['pendiente', 'regresar al inventario'])
    } else {
      query = query.eq('status', filtro)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching:", error)
      return
    }

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

    const resultado = Object.values(agrupados).sort((a, b) => {
      const aMod = a.items.some(i => i.modificado_vendedor || i.status === 'regresar al inventario') ? 1 : 0
      const bMod = b.items.some(i => i.modificado_vendedor || i.status === 'regresar al inventario') ? 1 : 0
      return bMod - aMod
    })

    setPedidosAgrupados(resultado)
    
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
      fetchYAgrupar()
    } catch (e) {
      console.error("Error al cancelar item:", e)
    }
  }

  const cancelarTodoElPedido = async (items) => {
    const esRetorno = items.some(i => i.status === 'regresar al inventario');
    const mensaje = esRetorno 
      ? "¿Confirmas que todos los zapatos han sido devueltos al estante físico?" 
      : "¿ESTÁS SEGURO? Se cancelarán todos los zapatos de este cliente.";

    if (!confirm(mensaje)) return

    for (const item of items) {
      await devolverStock(item)
      await supabase.from('solicitudes').update({ status: 'cancelado' }).eq('id', item.id)
    }
    setPedidoSeleccionado(null)
    fetchYAgrupar()
  }

  const toggleCheck = async (id, modificado) => {
    if (modificado) {
      await supabase.from('solicitudes').update({ modificado_vendedor: false }).eq('id', id)
    }
    setItemsCheckeados(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const procesarAListo = async (items) => {
    try {
      const promesas = items.map(item => {
        const updateData = { status: 'listo' };
        if (item.tipo_solicitud === 'venta de apartado') {
          updateData.tipo_solicitud = 'despacho';
        }
        return supabase.from('solicitudes').update(updateData).eq('id', item.id);
      });
      await Promise.all(promesas);
      setPedidoSeleccionado(null);
      setItemsCheckeados({});
      fetchYAgrupar();
    } catch (error) {
      console.error("Error al procesar a listo:", error);
    }
  }

  const procesarSalidaInteligente = async (items) => {
    const itemsParaDespacho = items.filter(i => i.tipo_solicitud === 'despacho');
    const itemsApartados = items.filter(i => i.tipo_solicitud === 'apartado');

    if (itemsParaDespacho.length === 0) {
      alert("Este pedido solo contiene APARTADOS. No se pueden marcar como entregados.");
      return;
    }

    if (itemsApartados.length > 0) {
      if (!confirm(`Se enviarán ${itemsParaDespacho.length} pares. Los apartados seguirán en lista.`)) return;
    }

    const ids = itemsParaDespacho.map(i => i.id);
    const { error } = await supabase.from('solicitudes').update({ status: 'entregado' }).in('id', ids);
    
    if (!error) {
      setPedidoSeleccionado(null);
      setItemsCheckeados({})
      fetchYAgrupar();
    }
  }

  const todosCheckeados = pedidoSeleccionado?.items.every(item => itemsCheckeados[item.id])
  const esPedidoDeRetorno = pedidoSeleccionado?.items.some(i => i.status === 'regresar al inventario')

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans ">
      
      {/* MODAL DE IMAGEN (OVERLAY) */}
      {imagenExpandida && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImagenExpandida(null)}
        >
          <div className="relative max-w-4xl w-full h-auto animate-in zoom-in-95 duration-200">
            <button className="absolute -top-12 right-0 text-white hover:text-blue-400 transition-colors">
              <X size={40} />
            </button>
            <img 
              src={imagenExpandida} 
              className="w-full h-auto rounded-[2rem] shadow-2xl border-4 border-white/10" 
              alt="Preview"
            />
          </div>
        </div>
      )}

      {/* PANEL IZQUIERDO: FIJO */}
      <div className="w-full md:w-[40%] lg:w-[35%] xl:w-[30%] border-r border-slate-200 bg-white flex flex-col shadow-2xl z-20 overflow-hidden">
        {/* Header fijo del panel izquierdo */}
        <div className="p-8 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter mb-6 flex items-center gap-3 italic">
            <Package size={28} className="text-blue-600" /> CONTROL ALMACÉN
          </h1>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            {['pendiente', 'listo', 'entregado'].map(f => (
              <button 
                key={f} 
                onClick={() => { setFiltro(f); setPedidoSeleccionado(null); }}
                className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filtro === f ? 'bg-white text-blue-600 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Zona de scroll para los pedidos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
          {pedidosAgrupados.map(p => {
            const tieneRetorno = p.items.some(i => i.status === 'regresar al inventario');
            const isActive = pedidoSeleccionado?.id_grupo === p.id_grupo;
            return (
              <div 
                key={p.id_grupo}
                onClick={() => setPedidoSeleccionado(p)}
                className={`p-6 rounded-[2rem] cursor-pointer transition-all border-2 relative group ${isActive ? 'border-blue-500 bg-white shadow-xl translate-x-2' : 'border-transparent bg-white hover:bg-slate-50 shadow-sm'}`}
              >
                {(p.items.some(i => i.modificado_vendedor || i.tipo_solicitud === 'venta de apartado') || tieneRetorno) && (
                  <div className={`absolute top-4 right-12 w-3 h-3 ${tieneRetorno ? 'bg-orange-500' : 'bg-blue-500'} rounded-full animate-pulse border-2 border-white shadow-sm`}></div>
                )}
                <h3 className="font-black text-slate-800 text-sm uppercase pr-8 truncate tracking-tight">{p.cliente}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-wider">ID Kommo: {p.kommo_id || '---'}</p>
                <div className="mt-4 flex items-center gap-2">
                   <div className="bg-blue-50 px-4 py-1 rounded-full text-[10px] font-black border border-blue-100 text-blue-600 uppercase italic">
                    {p.items.length} {p.items.length === 1 ? 'Calzado' : 'Calzados'}
                  </div>
                </div>
                <ChevronRight className={`absolute right-6 top-1/2 -translate-y-1/2 transition-all ${isActive ? 'text-blue-500 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'}`} size={22} />
              </div>
            )
          })}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLES */}
      <div className="flex-1 overflow-y-auto bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
        {pedidoSeleccionado ? (
          <div className="max-w-4xl mx-auto p-8 lg:p-16">
            {/* Header del pedido: estático dentro del flujo de scroll */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
              <div>
                <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-3 inline-block">Gestión Activa</span>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{pedidoSeleccionado.cliente}</h2>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[200px]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-center md:text-right">Canal de Contacto</p>
                <p className="font-black text-slate-800 flex items-center justify-center md:justify-end gap-2 text-base">
                  <Smartphone size={18} className="text-blue-500" /> {pedidoSeleccionado.telefono}
                </p>
              </div>
            </div>

            {/* Listado de calzados */}
            <div className="space-y-8">
              {pedidoSeleccionado.items.map(item => (
                <div key={item.id} className={`bg-white rounded-[3rem] p-8 shadow-sm border-2 flex flex-col sm:flex-row gap-10 items-center transition-all ${item.status === 'regresar al inventario' ? 'border-orange-400 bg-orange-50/20' : (item.tipo_solicitud === 'venta de apartado' || item.modificado_vendedor ? 'border-blue-400 bg-blue-50/20' : 'border-slate-50')}`}>
                  
                  <div 
                    className="w-56 h-56 bg-slate-100 rounded-[2.5rem] overflow-hidden flex-shrink-0 border border-slate-200 shadow-inner cursor-zoom-in group"
                    onClick={() => setImagenExpandida(item.inventario?.productos?.imagen_url)}
                  >
                    <img 
                      src={item.inventario?.productos?.imagen_url} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="Producto"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        item.status === 'regresar al inventario'
                        ? 'bg-orange-500 text-white'
                        : item.tipo_solicitud === 'venta de apartado' 
                          ? 'bg-blue-600 text-white' 
                          : item.tipo_solicitud === 'apartado' 
                            ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                            : 'bg-purple-100 text-purple-600 border border-purple-200'
                      }`}>
                        {item.status === 'regresar al inventario' ? 'POR REGRESAR' : item.tipo_solicitud}
                      </span>
                      <span className="text-[11px] font-black text-slate-300 ml-auto bg-slate-50 px-3 py-1 rounded-md border border-slate-100">REF: {item.inventario?.productos?.codigo_ref}</span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-800 uppercase truncate mb-1 italic tracking-tight">{item.inventario?.productos?.nombre}</h3>
                    
                    {item.nota_almacen && (
                      <div className="flex items-start gap-2 bg-slate-50 p-4 rounded-2xl text-slate-600 font-bold mb-4 border-l-4 border-blue-500 shadow-sm italic text-xs">
                        <AlertCircle size={14} className="mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>"{item.nota_almacen}"</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <p className="bg-blue-600 text-white px-5 py-1.5 rounded-xl font-black text-sm italic shadow-lg shadow-blue-200">TALLA {item.inventario?.talla}</p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-tight">
                        <Truck size={16} className="text-blue-500" /> 
                        {item.metodo_entrega || 'RETIRO EN TIENDA'}
                      </div>
                    </div>

                    {(item.status === 'regresar al inventario') && (
                      <div className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black animate-pulse shadow-lg shadow-orange-200 w-fit">
                        <RefreshCcw size={14} className="animate-spin-slow" /> DEVOLUCIÓN FÍSICA OBLIGATORIA
                      </div>
                    )}
                    
                    {(item.modificado_vendedor || item.tipo_solicitud === 'venta de apartado') && item.status !== 'regresar al inventario' && (
                      <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black animate-pulse shadow-lg shadow-blue-200 w-fit">
                        <AlertCircle size={14} /> REUBICACIÓN: SACAR DE APARTADOS
                      </div>
                    )}
                  </div>

                  {filtro !== 'entregado' && (
                    <div className="flex flex-row sm:flex-col gap-4 w-full sm:w-auto">
                      {item.status !== 'regresar al inventario' && (
                        <button 
                          onClick={() => cancelarItem(item)}
                          className="flex-1 sm:w-20 sm:h-20 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border-2 border-red-100 shadow-sm group"
                        >
                          <XCircle size={32} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      
                      {filtro === 'pendiente' && (
                        <button 
                          onClick={() => toggleCheck(item.id, item.modificado_vendedor)}
                          className={`flex-1 sm:w-20 sm:h-20 rounded-[1.5rem] flex items-center justify-center border-2 transition-all group ${itemsCheckeados[item.id] ? (item.status === 'regresar al inventario' ? 'bg-orange-500 border-orange-200 text-white shadow-xl scale-105' : 'bg-emerald-500 border-emerald-200 text-white shadow-xl scale-105') : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                        >
                          <CheckCircle size={32} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Botones de acción final */}
            <div className="mt-14 space-y-4 pb-12">
              {filtro === 'pendiente' && (
                <>
                  {!esPedidoDeRetorno ? (
                    <button 
                      disabled={!todosCheckeados}
                      onClick={() => procesarAListo(pedidoSeleccionado.items)}
                      className={`w-full py-8 rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl transition-all ${todosCheckeados ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {todosCheckeados ? 'CONFIRMAR TODO EL LOTE' : 'FALTA VERIFICAR CALZADOS'}
                    </button>
                  ) : (
                    <button 
                      disabled={!todosCheckeados}
                      onClick={() => cancelarTodoElPedido(pedidoSeleccionado.items)}
                      className={`w-full py-8 rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl transition-all ${todosCheckeados ? 'bg-orange-600 text-white hover:bg-orange-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {todosCheckeados ? 'DEVOLUCIÓN COMPLETADA' : 'VERIFICA LOS ZAPATOS A REGRESAR'}
                    </button>
                  )}
                  
                  {!esPedidoDeRetorno && (
                    <button 
                      onClick={() => cancelarTodoElPedido(pedidoSeleccionado.items)}
                      className="w-full py-5 bg-transparent border-2 border-red-100 text-red-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-colors"
                    >
                      CANCELAR GESTIÓN COMPLETA
                    </button>
                  )}
                </>
              )}

              {filtro === 'listo' && (
                <button 
                  onClick={() => procesarSalidaInteligente(pedidoSeleccionado.items)}
                  className="w-full py-8 bg-emerald-600 text-white rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
                >
                  <Truck size={24} /> CONFIRMAR SALIDA DE MERCANCÍA
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Estado vacío */
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col items-center">
              <ShoppingBag size={120} strokeWidth={0.5} className="opacity-20 mb-6 text-blue-600" />
              <p className="font-black uppercase tracking-[0.4em] text-xs text-slate-400">Panel de despacho</p>
              <p className="text-slate-300 text-[10px] mt-2 font-bold italic">Selecciona un cliente para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}