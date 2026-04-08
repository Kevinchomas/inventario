import { PlusCircle, ShoppingBag } from 'lucide-react'

export default function ZapatoCard({ zapato, pedidoIniciado, onAbrirGestion }) {
  
  // Función para manejar el click solo si el pedido base ya existe
  const handleCardClick = () => {
    if (pedidoIniciado) {
      onAbrirGestion(zapato)
    }
  }

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-[2.5rem] shadow-sm border overflow-hidden transition-all duration-500 group relative
        ${pedidoIniciado 
          ? 'border-slate-100 hover:shadow-2xl hover:-translate-y-2 cursor-pointer' 
          : 'border-slate-50 opacity-60 grayscale-[0.8] cursor-not-allowed'
        }`}
    >
      {/* CONTENEDOR DE IMAGEN */}
      <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden">
        {zapato.imagen_url ? (
          <img 
            src={zapato.imagen_url} 
            alt={zapato.nombre} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <ShoppingBag size={24} strokeWidth={1} />
            <span className="text-[10px] font-black uppercase italic tracking-tighter">Sin Fotografía</span>
          </div>
        )}
        
        {/* ETIQUETA DE REFERENCIA (Badge superior) */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm border border-slate-100 uppercase tracking-tighter">
          REF: <span className="text-blue-600">{zapato.codigo_ref}</span>
        </div>

        {/* OVERLAY DE INTERACCIÓN */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${pedidoIniciado ? 'bg-blue-600/10 opacity-0 group-hover:opacity-100' : 'bg-slate-100/40 opacity-100'}`}>
           {pedidoIniciado ? (
             <div className="bg-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
               <PlusCircle size={16} className="text-blue-600" />
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Configurar Venta</span>
             </div>
           ) : (
             <div className="bg-white/80 backdrop-blur-sm p-4 rounded-full border border-white/50">
               <ShoppingBag size={20} className="text-slate-400" />
             </div>
           )}
        </div>
      </div>

      {/* INFORMACIÓN DEL PRODUCTO */}
      <div className="p-5 space-y-1">
        <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
          {zapato.categorias?.nombre || 'Nueva Colección'}
        </p>
        
        <h3 className="font-black text-slate-800 text-sm leading-tight truncate uppercase italic tracking-tight">
          {zapato.nombre}
        </h3>

        {/* VISTA PREVIA DE TALLAS Y STOCK DISPONIBLE */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {zapato.inventario
            ?.filter(i => i.cantidad_disponible > 0)
            .sort((a, b) => a.talla - b.talla) // Ordenamos por talla para que sea legible
            .slice(0, 6) // Mostramos hasta 6 para no saturar la card
            .map((item) => (
            <div 
              key={item.id} 
              className="flex items-center bg-slate-50 rounded-lg border border-slate-100 overflow-hidden"
            >
              <span className="text-[8px] font-black px-1.5 py-1 bg-white text-slate-700 border-r border-slate-100">
                {item.talla}
              </span>
              <span className={`text-[8px] font-black px-1.5 py-1 ${item.cantidad_disponible <= 2 ? 'text-orange-500' : 'text-blue-500'}`}>
                {item.cantidad_disponible}
              </span>
            </div>
          ))}
          
          {zapato.inventario?.filter(i => i.cantidad_disponible > 0).length > 6 && (
            <span className="text-[8px] font-bold text-slate-400 self-center ml-1">...</span>
          )}
        </div>

        {/* INDICADOR DE AGOTADO */}
        {(!zapato.inventario || zapato.inventario.every(i => i.cantidad_disponible <= 0)) && (
          <div className="mt-2 text-[9px] font-black text-red-500 uppercase italic bg-red-50 py-1 px-3 rounded-full inline-block border border-red-100">
            Agotado en Almacén
          </div>
        )}
      </div>

      {/* GRADIENTE DE BLOQUEO (Sutil) */}
      {!pedidoIniciado && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-200/20" />
      )}
    </div>
  )
}