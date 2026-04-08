import { useState } from 'react'
import { AlertTriangle, PlusCircle } from 'lucide-react'
import ModalGestionVenta from './ModalGestionVenta'

export default function ZapatoCard({ zapato, onUpdate }) {
  // Estado para controlar la visibilidad del modal de gestión
  const [mostrarModal, setMostrarModal] = useState(false)

  return (
    <>
      <div 
        onClick={() => setMostrarModal(true)}
        className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer relative"
      >
        
        {/* SECCIÓN IMAGEN */}
        <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden">
          {zapato.imagen_url ? (
            <img 
              src={zapato.imagen_url} 
              alt={zapato.nombre}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">
              Sin fotografía
            </div>
          )}
          
          {/* Badge Flotante Superior (REF) */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-brand-dark text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
            REF: <span className="text-brand-primary">{zapato.codigo_ref}</span>
          </div>

          {/* Botón de Incidencia (Se mantiene visual por ahora) */}
          <button 
            onClick={(e) => { e.stopPropagation(); /* Evita abrir el modal al tocar incidencia */ }}
            className="absolute top-4 right-4 p-2 bg-red-50/80 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
          >
            <AlertTriangle size={14} />
          </button>

          {/* Overlay que aparece al hacer hover: "Gestionar" */}
          <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <div className="bg-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                <PlusCircle size={16} className="text-brand-primary" />
                <span className="text-[10px] font-black text-brand-dark uppercase tracking-wider">Gestionar Venta</span>
             </div>
          </div>
        </div>

        {/* SECCIÓN INFO */}
        <div className="p-5">
          <div className="space-y-1 mb-4">
            <p className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em]">
              {zapato.categorias?.nombre || 'General'}
            </p>
            <h3 className="font-extrabold text-slate-800 text-lg leading-tight group-hover:text-brand-primary transition-colors">
              {zapato.nombre}
            </h3>
          </div>
          
          {/* Visualización rápida de Stock (Solo lectura) */}
          <div className="pt-4 border-t border-slate-50">
            <div className="flex flex-wrap gap-1.5">
              {zapato.inventario?.map((item) => (
                <div 
                  key={item.id}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-black ${
                    item.cantidad_disponible > 0 
                    ? 'bg-slate-50 border-slate-100 text-slate-500' 
                    : 'bg-red-50 border-transparent text-red-300 line-through'
                  }`}
                >
                  T{item.talla}: {item.cantidad_disponible}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase tracking-tight text-center italic">
               Toca la tarjeta para solicitar o apartar
            </p>
          </div>
        </div>
      </div>

      {/* RENDERIZADO DEL MODAL: Solo aparece si mostrarModal es true */}
      {mostrarModal && (
        <ModalGestionVenta 
          zapato={zapato} 
          onClose={() => setMostrarModal(false)} 
          onUpdate={onUpdate} 
        />
      )}
    </>
  )
}