import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Truck, CheckCircle, XCircle, MapPin, Smartphone, 
  Package, ChevronRight, AlertCircle, RefreshCcw, X, Search, SortAsc, SortDesc, Clock, ShoppingBag
} from 'lucide-react'

export default function GestionAlmacen() {
  const [pedidosAgrupados, setPedidosAgrupados] = useState([])
  const [filtro, setFiltro] = useState('pendiente') 
  const [subFiltroEnvio, setSubFiltroEnvio] = useState('todos')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [itemsCheckeados, setItemsCheckeados] = useState({})
  const [imagenExpandida, setImagenExpandida] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [ordenAscendente, setOrdenAscendente] = useState(false)

  useEffect(() => {
    fetchYAgrupar()
    const channel = supabase
      .channel('cambios-almacen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => {
        fetchYAgrupar()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [filtro, subFiltroEnvio, ordenAscendente])

  // Función auxiliar para normalizar y extraer el transportista de la dirección
  const extraerMetodo = (direccion = '') => {
    const dir = direccion.toLowerCase().trim();
    if (dir.includes('retiro en tienda')) return 'retiro';
    if (dir.startsWith('servientrega')) return 'servientrega';
    if (dir.startsWith('larcourier')) return 'larcourier';
    if (dir.startsWith('especial')) return 'especial';
    return 'otros';
  };

  const fetchYAgrupar = async () => {
    const { data: allData, error: allError } = await supabase
      .from('solicitudes')
      .select(`
        *,
        inventario:inventario_id (
          id, talla, 
          productos:producto_id (nombre, codigo_ref, imagen_url)
        )
      `)
      .order('created_at', { ascending: ordenAscendente })

    if (allError) return

    const dataFiltrada = allData.filter(item => {
      if (filtro === 'pendiente') return ['pendiente', 'regresar al inventario'].includes(item.status)
      if (filtro === 'apartados') return item.status === 'listo' && item.tipo_solicitud === 'apartado'
      if (filtro === 'por_enviar') {
        const esPorEnviar = item.status === 'listo' && item.tipo_solicitud === 'despacho'
        if (!esPorEnviar) return false
        
        if (subFiltroEnvio === 'todos') return true
        const metodoExtraido = extraerMetodo(item.cliente_direccion);
        
        // Validación estricta para los sub-tabs
        if (subFiltroEnvio === 'retiro') return metodoExtraido === 'retiro';
        return metodoExtraido === subFiltroEnvio;
      }
      return item.status === filtro
    })

    const agrupados = dataFiltrada.reduce((acc, curr) => {
      const metodoExtraido = extraerMetodo(curr.cliente_direccion);
      const direccionKey = (curr.cliente_direccion || 'sin-direccion').toLowerCase();
      
      // Agrupamos por ID + Método + Dirección exacta para evitar mezclar despachos distintos del mismo cliente
      const key = filtro === 'por_enviar' 
        ? `${curr.kommo_id || 'sin-id'}-${metodoExtraido}-${direccionKey}`
        : (curr.kommo_id || 'sin-id');

      if (!acc[key]) {
        const existeEnApartados = allData.some(item => 
          item.kommo_id === curr.kommo_id && 
          item.status === 'listo' && 
          item.tipo_solicitud === 'apartado'
        )

        acc[key] = {
          id_grupo: key, 
          kommo_id: curr.kommo_id,
          metodo_grupo: metodoExtraido,
          direccion_grupo: curr.cliente_direccion,
          telefono: curr.cliente_telefono,
          tieneHistorialApartado: existeEnApartados,
          fecha_creacion: curr.created_at,
          items: []
        }
      }
      acc[key].items.push(curr)
      return acc
    }, {})

    const resultado = Object.values(agrupados).sort((a, b) => {
      const dateA = new Date(a.fecha_creacion);
      const dateB = new Date(b.fecha_creacion);
      return ordenAscendente ? dateA - dateB : dateB - dateA;
    });

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
    } catch (e) { console.error(e) }
  }

  const finalizarGestion = async (items, nuevoStatus) => {
    const ids = items.map(i => i.id)
    const { error } = await supabase.from('solicitudes').update({ status: nuevoStatus }).in('id', ids)
    if (!error) {
      setPedidoSeleccionado(null)
      setItemsCheckeados({})
      fetchYAgrupar()
    }
  }

  const toggleCheck = (id) => {
    setItemsCheckeados(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatFecha = (iso) => {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const pedidosFiltrados = pedidosAgrupados.filter(p => {
    const q = busqueda.toLowerCase()
    return p.kommo_id?.toString().includes(q) || p.items.some(i => i.cliente_nombre?.toLowerCase().includes(q))
  })

  const agruparPorNombre = (items) => {
    return items.reduce((acc, item) => {
      const nombre = item.cliente_nombre || 'Sin Nombre';
      if (!acc[nombre]) acc[nombre] = [];
      acc[nombre].push(item);
      return acc;
    }, {});
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
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

      {/* PANEL IZQUIERDO */}
      <div className="w-full md:w-[35%] lg:w-[30%] border-r border-slate-200 bg-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-2xl font-black text-slate-800 italic mb-6 flex items-center gap-3">
            <Package size={28} className="text-blue-600" /> CONTROL ALMACÉN
          </h1>
          
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar por ID o Nombre..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 mb-6">
            {[
              {id: 'pendiente', label: 'PENDIENTE'},
              {id: 'apartados', label: 'APARTADOS'},
              {id: 'por_enviar', label: 'POR ENVIAR'},
              {id: 'entregado', label: 'ENTREGADO'}
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => { setFiltro(tab.id); setPedidoSeleccionado(null); }}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtro === tab.id ? 'bg-white text-blue-600 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filtro === 'por_enviar' && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                {id: 'todos', label: 'TODOS'},
                {id: 'servientrega', label: 'SERVIENTREGA'},
                {id: 'larcourier', label: 'LARCOURIER'},
                {id: 'retiro', label: 'EN TIENDA'}
              ].map(s => (
                <button 
                  key={s.id} onClick={() => { setSubFiltroEnvio(s.id); setPedidoSeleccionado(null); }}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${subFiltroEnvio === s.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={() => setOrdenAscendente(!ordenAscendente)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest"
          >
            {ordenAscendente ? <SortAsc size={16}/> : <SortDesc size={16}/>}
            {ordenAscendente ? 'Más viejos primero' : 'Más recientes primero'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {pedidosFiltrados.map(p => {
            const isActive = pedidoSeleccionado?.id_grupo === p.id_grupo;
            const esNuevo = !p.tieneHistorialApartado && filtro === 'pendiente';
            
            return (
              <div 
                key={p.id_grupo} onClick={() => setPedidoSeleccionado(p)}
                className={`p-6 rounded-[2rem] cursor-pointer transition-all border-2 bg-white relative group
                  ${isActive ? 'border-blue-500 shadow-xl translate-x-2' : 'border-transparent shadow-sm hover:bg-slate-50'}
                  ${esNuevo && filtro === 'pendiente' ? 'border-l-blue-600 border-l-8' : ''}
                  ${p.tieneHistorialApartado && filtro === 'pendiente' ? 'border-l-yellow-500 border-l-8' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">ID: {p.kommo_id}</h3>
                    {filtro === 'por_enviar' && (
                       <span className="text-[9px] font-bold text-blue-500 uppercase italic">
                         {p.metodo_grupo === 'retiro' ? '🏠 Retiro en Tienda' : `🚚 ${p.metodo_grupo}`}
                       </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                    <Clock size={12} /> {formatFecha(p.fecha_creacion)}
                  </div>
                </div>

                {filtro === 'por_enviar' && p.direccion_grupo && (
                  <p className="text-[10px] text-slate-500 font-bold truncate mb-2">
                    📍 {p.direccion_grupo}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="bg-blue-50 px-4 py-1 rounded-full text-[10px] font-black text-blue-600 uppercase italic border border-blue-100">
                    {p.items.length} {p.items.length === 1 ? 'Calzado' : 'Calzados'}
                  </span>
                  <ChevronRight size={22} className={`transition-all ${isActive ? 'text-blue-500 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'}`} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        {pedidoSeleccionado ? (
          <div className="max-w-4xl mx-auto p-8 lg:p-16 w-full">
            
            <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
              <div>
                <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-3 inline-block">
                  {filtro === 'por_enviar' ? 'Hoja de Despacho' : 'Lote en Gestión'}
                </span>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                  <span className="text-blue-600 text-lg block mb-1">ID Kommo:</span>
                  {pedidoSeleccionado.kommo_id}
                </h2>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[180px] text-center md:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Contacto</p>
                <p className="font-black text-slate-800 flex items-center justify-center md:justify-end gap-2 text-base">
                  <Smartphone size={18} className="text-blue-500" /> {pedidoSeleccionado.telefono || 'Sin Telf'}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              {Object.entries(agruparPorNombre(pedidoSeleccionado.items)).map(([nombre, items]) => (
                <div key={nombre} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Cliente: {nombre}</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>

                  <div className="space-y-8">
                    {items.map(item => {
                      const isRetorno = item.status === 'regresar al inventario';
                      const isVentaApartado = item.tipo_solicitud === 'venta de apartado' || item.modificado_vendedor;
                      const metodoItem = extraerMetodo(item.cliente_direccion);
                      const mostrarDireccion = metodoItem !== 'retiro';

                      return (
                        <div key={item.id} className={`bg-white rounded-[3rem] p-8 shadow-sm border-2 flex flex-col sm:flex-row gap-10 items-center transition-all 
                          ${isRetorno ? 'border-orange-400 bg-orange-50/20' : (isVentaApartado ? 'border-blue-400 bg-blue-50/20' : 'border-slate-50 hover:border-slate-200')}`}
                        >
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
                                isRetorno ? 'bg-orange-500 text-white' : 
                                item.tipo_solicitud === 'apartado' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 
                                'bg-purple-100 text-purple-600 border border-purple-200'
                              }`}>
                                {isRetorno ? 'POR REGRESAR' : item.tipo_solicitud}
                              </span>
                              <span className="text-[11px] font-black text-slate-300 ml-auto bg-slate-50 px-3 py-1 rounded-md border border-slate-100 uppercase">
                                REF: {item.inventario?.productos?.codigo_ref}
                              </span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-800 uppercase truncate mb-1 italic tracking-tight">
                              {item.inventario?.productos?.nombre}
                            </h3>
                            
                            {item.nota_almacen && (
                              <div className="flex items-start gap-2 bg-slate-50 p-4 rounded-2xl text-slate-600 font-bold mb-4 border-l-4 border-blue-500 shadow-sm italic text-xs">
                                <AlertCircle size={14} className="mt-0.5 text-blue-500 flex-shrink-0" />
                                <span>"{item.nota_almacen}"</span>
                              </div>
                            )}

                            <div className="flex flex-col gap-3 mb-6">
                              <div className="flex items-center gap-4">
                                <p className="bg-blue-600 text-white px-5 py-1.5 rounded-xl font-black text-sm italic shadow-lg shadow-blue-200">
                                  TALLA {item.inventario?.talla}
                                </p>
                                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-tight">
                                  <Truck size={16} className="text-blue-500" /> 
                                  {metodoItem === 'retiro' ? 'RETIRO EN TIENDA' : metodoItem.toUpperCase()}
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-2 bg-slate-100/50 p-4 rounded-[1.5rem] border border-dashed border-slate-200">
                                <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                                    {metodoItem === 'retiro' ? 'Punto de Retiro:' : 'Dirección de Envío:'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed">
                                    {item.cliente_direccion || 'DETALLES PENDIENTES'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {isRetorno && (
                              <div className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black animate-pulse shadow-lg shadow-orange-200 w-fit">
                                <RefreshCcw size={14} className="animate-spin" style={{animationDuration: '3s'}} /> 
                                DEVOLUCIÓN FÍSICA OBLIGATORIA
                              </div>
                            )}
                          </div>

                          <div className="flex flex-row sm:flex-col gap-4 w-full sm:w-auto">
                            {filtro === 'pendiente' && (
                              <>
                                {!isRetorno && (
                                  <button 
                                    onClick={() => cancelarItem(item)}
                                    className="flex-1 sm:w-20 sm:h-20 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border-2 border-red-100 shadow-sm group"
                                  >
                                    <XCircle size={32} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => toggleCheck(item.id)}
                                  className={`flex-1 sm:w-20 sm:h-20 rounded-[1.5rem] flex items-center justify-center border-2 transition-all group 
                                    ${itemsCheckeados[item.id] 
                                      ? (isRetorno ? 'bg-orange-500 border-orange-200 text-white shadow-xl scale-105' : 'bg-emerald-500 border-emerald-200 text-white shadow-xl scale-105') 
                                      : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                                >
                                  <CheckCircle size={32} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 pb-12">
              {filtro === 'pendiente' && (
                <button 
                  disabled={!pedidoSeleccionado.items.every(i => itemsCheckeados[i.id])}
                  onClick={() => finalizarGestion(pedidoSeleccionado.items, 'listo')}
                  className={`w-full py-8 rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl transition-all 
                    ${pedidoSeleccionado.items.every(i => itemsCheckeados[i.id]) 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {pedidoSeleccionado.items.every(i => itemsCheckeados[i.id]) ? 'CONFIRMAR TODO EL LOTE' : 'FALTA VERIFICAR CALZADOS'}
                </button>
              )}

              {filtro === 'por_enviar' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => finalizarGestion(pedidoSeleccionado.items, 'entregado')}
                    className="flex-1 py-8 bg-emerald-600 text-white rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
                  >
                    <Truck size={24}/> FINALIZAR SALIDA DE MERCANCÍA
                  </button>
                  <button 
                    onClick={async () => {
                      if(!confirm("¿Cancelar envío y regresar al stock?")) return;
                      for(const i of pedidoSeleccionado.items) await devolverStock(i);
                      finalizarGestion(pedidoSeleccionado.items, 'cancelado');
                    }}
                    className="px-10 py-8 bg-white border-2 border-red-100 text-red-500 rounded-[2.5rem] font-black hover:bg-red-50 transition-all shadow-lg"
                  >
                    <RefreshCcw size={24}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col items-center">
              <ShoppingBag size={120} strokeWidth={0.5} className="opacity-20 mb-6 text-blue-600" />
              <p className="font-black uppercase tracking-[0.4em] text-xs text-slate-400">Panel de despacho</p>
              <p className="text-slate-300 text-[10px] mt-2 font-bold italic">Selecciona un lote para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}