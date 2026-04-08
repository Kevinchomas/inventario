import { useState } from 'react'
import { X, Plus, Minus, Clock, ShoppingBag, Store, Truck, MessageSquare, MapPin } from 'lucide-react'
import Button from './ui/Button'

export default function ModalGestionVenta({ zapato, datosBaseCliente, onClose, onAgregar }) {
  // Estado para alternar entre Apartado (Naranja) y Despacho (Azul/Verde)
  const [tab, setTab] = useState('apartado') 
  const [seleccion, setSeleccion] = useState({}) // { id_inventario: cantidad }
  
  // Estados para logística personalizada
  const [usarDireccionGlobal, setUsarDireccionGlobal] = useState(true)
  const [metodoEspecial, setMetodoEspecial] = useState('retiro')
  const [dirEspecial, setDirEspecial] = useState('')
  const [notaIndividual, setNotaIndividual] = useState('')

  const ajustarCantidad = (id, delta, max) => {
    const actual = seleccion[id] || 0
    const nueva = actual + delta
    if (nueva >= 0 && nueva <= max) {
      setSeleccion({ ...seleccion, [id]: nueva })
    }
  }

  const handleConfirmar = () => {
    const itemsParaAgregar = Object.entries(seleccion).filter(([_, cant]) => cant > 0)
    
    if (itemsParaAgregar.length === 0) return alert("Selecciona al menos una talla")

    // LÓGICA DE DIRECCIÓN (Regla de Oro del Prompt)
    let direccionFinal = ''
    if (tab === 'apartado') {
      direccionFinal = 'APARTADO EN ALMACÉN'
    } else {
      if (usarDireccionGlobal) {
        // Hereda del cliente base
        direccionFinal = datosBaseCliente.metodo === 'envio' 
          ? `${datosBaseCliente.courier}: ${datosBaseCliente.provincia}, ${datosBaseCliente.ciudad}. ${datosBaseCliente.direccion}`
          : 'RETIRO EN TIENDA'
      } else {
        // Logística personalizada para este par
        direccionFinal = metodoEspecial === 'envio' 
          ? `ESPECIAL: ${dirEspecial}` 
          : 'RETIRO EN TIENDA'
      }
    }

    // Enviamos cada talla seleccionada como un item individual al carrito
    itemsParaAgregar.forEach(([invId, cantidad]) => {
      const itemInv = zapato.inventario.find(i => i.id === invId)
      
      const configItem = {
        tipo_solicitud: tab === 'apartado' ? 'apartado' : 'despacho',
        metodo_entrega: tab === 'apartado' ? 'retiro' : (usarDireccionGlobal ? datosBaseCliente.metodo : metodoEspecial),
        cliente_direccion: direccionFinal,
        nota_almacen: notaIndividual || datosBaseCliente.nota_general,
        cantidad_seleccionada: cantidad 
      }

      onAgregar(zapato, itemInv, configItem)
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">{zapato.nombre}</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase">Configurar para: {datosBaseCliente.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        {/* SELECTOR DE TIPO (TABS) */}
        <div className="flex p-2 bg-slate-100 mx-6 mt-6 rounded-2xl">
          <button 
            onClick={() => setTab('apartado')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tab === 'apartado' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            <Clock size={14} /> Apartado
          </button>
          <button 
            onClick={() => setTab('despacho')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tab === 'despacho' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <ShoppingBag size={14} /> Despacho
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* TALLAS DISPONIBLES */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase italic">Seleccionar Tallas:</label>
            <div className="grid gap-2">
              {zapato.inventario?.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-700 text-sm">Talla {item.talla}</span>
                    <span className="text-[9px] font-bold text-slate-400 italic">Stock: {item.cantidad_disponible}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => ajustarCantidad(item.id, -1, item.cantidad_disponible)} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"><Minus size={14} /></button>
                    <span className="font-black text-lg w-4 text-center">{seleccion[item.id] || 0}</span>
                    <button onClick={() => ajustarCantidad(item.id, 1, item.cantidad_disponible)} className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white hover:bg-black"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOGÍSTICA (Solo si es Despacho) */}
          {tab === 'despacho' && (
            <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-700 uppercase italic">
                  <MapPin size={14} /> Dirección de Entrega
                </div>
                <button 
                  onClick={() => setUsarDireccionGlobal(!usarDireccionGlobal)}
                  className="text-[9px] font-black text-blue-600 underline uppercase"
                >
                  {usarDireccionGlobal ? 'Personalizar' : 'Usar Principal'}
                </button>
              </div>

              {usarDireccionGlobal ? (
                <div className="bg-white p-3 rounded-xl border border-blue-100 text-[10px] font-bold text-slate-600 leading-snug">
                  {datosBaseCliente.metodo === 'envio' 
                    ? `${datosBaseCliente.courier}: ${datosBaseCliente.ciudad}. ${datosBaseCliente.direccion}` 
                    : 'Retiro en Tienda (Principal)'}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setMetodoEspecial('retiro')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${metodoEspecial === 'retiro' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>Retiro Especial</button>
                    <button onClick={() => setMetodoEspecial('envio')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${metodoEspecial === 'envio' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>Envío Especial</button>
                  </div>
                  {metodoEspecial === 'envio' && (
                    <textarea 
                      placeholder="Indique Courier y Dirección específica..." 
                      className="w-full p-3 bg-white border border-blue-100 rounded-xl text-xs font-bold h-16 outline-none focus:ring-2 ring-blue-500/20"
                      value={dirEspecial}
                      onChange={(e) => setDirEspecial(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* NOTA PARA ALMACÉN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 italic">
              <MessageSquare size={12}/> Nota para Almacén (Opcional):
            </label>
            <textarea 
              placeholder="Ej: Empacar por separado, revisar costuras..." 
              className="w-full p-4 rounded-2xl bg-yellow-50/30 border border-yellow-100 text-xs font-bold h-20 outline-none"
              value={notaIndividual}
              onChange={(e) => setNotaIndividual(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t border-slate-100">
          <Button 
            onClick={handleConfirmar}
            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.1em] shadow-xl transition-all ${tab === 'apartado' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Añadir {Object.values(seleccion).reduce((a, b) => a + b, 0)} items al Carrito
          </Button>
        </div>
      </div>
    </div>
  )
}