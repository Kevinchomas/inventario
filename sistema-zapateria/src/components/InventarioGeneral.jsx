import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Search, Palette, Layers, ChevronRight, 
  X, Plus, Minus, Trash2, Save, Tag, Hash, PlusCircle, Camera, Upload
} from 'lucide-react'

export default function InventarioGeneral() {
  const [inventarioRaw, setInventarioRaw] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('todas')
  
  const [productoEditando, setProductoEditando] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchDatos()
  }, [])

  async function fetchDatos() {
    const { data: invData } = await supabase
      .from('inventario')
      .select(`
        *,
        productos:producto_id (
          id, nombre, codigo_ref, imagen_url, categoria_id,
          categorias:categoria_id (nombre)
        )
      `)
    const { data: catData } = await supabase.from('categorias').select('*')
    setInventarioRaw(invData || [])
    setCategorias(catData || [])
  }

  const productosAgrupados = useMemo(() => {
    const grupos = {}
    inventarioRaw.forEach(item => {
      const p = item.productos
      if (!p) return

      const term = busqueda.toLowerCase().trim()
      const cumpleNombreRef = p.nombre?.toLowerCase().includes(term) || p.codigo_ref?.toLowerCase().includes(term)
      const cumpleTalla = item.talla?.toString() === term 
      
      const cumpleBusqueda = term === '' || cumpleNombreRef || cumpleTalla
      const cumpleCat = filtroCat === 'todas' || p.categoria_id === filtroCat
      
      if (!cumpleBusqueda || !cumpleCat) return

      if (!grupos[p.id]) {
        grupos[p.id] = { ...p, stockTotal: 0, variaciones: [] }
      }

      grupos[p.id].stockTotal += item.cantidad_disponible
      grupos[p.id].variaciones.push({
        id: item.id,
        talla: item.talla,
        color: item.color || 'Único',
        cant: item.cantidad_disponible
      })
    })
    return Object.values(grupos)
  }, [inventarioRaw, busqueda, filtroCat])

  const eliminarModeloCompleto = async (e, productoId) => {
    e.stopPropagation()
    const confirmar = window.confirm("¿ESTÁS SEGURO? Esta acción eliminará el modelo y TODA su existencia de forma permanente.")
    if (!confirmar) return

    try {
      await supabase.from('inventario').delete().eq('producto_id', productoId)
      await supabase.from('productos').delete().eq('id', productoId)
      fetchDatos()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10 animate-in fade-in duration-500">
      
      {/* BUSCADOR */}
      <div className="sticky top-0 z-[40] bg-slate-50/80 backdrop-blur-md py-4">
        <div className="bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar modelo, REF o talla..." 
              className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[2rem] border-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select 
            className="px-8 py-5 bg-slate-50 rounded-[2rem] border-none font-black text-slate-500 text-xs uppercase"
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
          >
            <option value="todas">Todas las Categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* GRILLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {productosAgrupados.map((prod) => (
          <div 
            key={prod.id} 
            onClick={() => { setProductoEditando(prod); setIsModalOpen(true); }}
            className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer"
          >
            <div className="aspect-[16/11] relative overflow-hidden bg-slate-200">
              <img src={prod.imagen_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="zapato" />
              
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-white/50">
                <span className="text-[10px] font-black text-slate-400 uppercase block leading-none mb-1">REF</span>
                <span className="text-sm font-black text-slate-900 uppercase">{prod.codigo_ref || 'S/R'}</span>
              </div>

              <button 
                onClick={(e) => eliminarModeloCompleto(e, prod.id)}
                className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl shadow-xl transition-all scale-90 group-hover:scale-100"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="absolute bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-[1.5rem] shadow-2xl">
                <p className="text-[10px] font-black uppercase opacity-70 leading-none mb-1">Stock</p>
                <p className="text-2xl font-black leading-none">{prod.stockTotal}</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 block">{prod.categorias?.nombre}</span>
                <h3 className="font-black text-slate-800 uppercase text-xl group-hover:text-blue-600 transition-colors">{prod.nombre}</h3>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                {prod.variaciones.map((v, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${v.cant > 0 ? 'bg-slate-50 border-slate-100' : 'bg-red-50 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        <span className="font-black text-slate-900 text-sm">{v.talla}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase">{v.color}</span>
                    </div>
                    <span className={`text-xs font-black ${v.cant > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{v.cant}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && productoEditando && (
        <ModalGestion 
          producto={productoEditando} 
          categorias={categorias}
          onClose={() => setIsModalOpen(false)} 
          onUpdate={fetchDatos}
        />
      )}
    </div>
  )
}

function ModalGestion({ producto, categorias, onClose, onUpdate }) {
  const [nombre, setNombre] = useState(producto.nombre)
  const [categoriaId, setCategoriaId] = useState(producto.categoria_id)
  const [variaciones, setVariaciones] = useState([...producto.variaciones])
  const [imgUrl, setImgUrl] = useState(producto.imagen_url)
  const [imgFile, setImgFile] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const fileInputRef = useRef(null)

  const agregarVariacion = () => {
    setVariaciones([...variaciones, { id: 'temp-' + Date.now(), talla: '', color: 'Único', cant: 1, esNueva: true }])
  }

  const removerVariacion = (idx) => {
    setVariaciones(variaciones.filter((_, i) => i !== idx))
  }

  const handleVariacionChange = (idx, campo, valor) => {
    const nuevas = [...variaciones]
    nuevas[idx][campo] = valor
    setVariaciones(nuevas)
  }

  // Manejo de nueva imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImgFile(file)
      setImgUrl(URL.createObjectURL(file)) // Previsualización local
    }
  }

  const guardarCambios = async () => {
    setLoading(true)
    try {
      let finalImgUrl = imgUrl

      // 1. Subir imagen si se cambió
      if (imgFile) {
        const fileExt = imgFile.name.split('.').pop()
        const fileName = `${producto.codigo_ref}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, imgFile)
        
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from('productos').getPublicUrl(fileName)
          finalImgUrl = publicUrl.publicUrl
        }
      }

      // 2. Actualizar Producto base
      await supabase.from('productos').update({ 
        nombre, 
        categoria_id: categoriaId,
        imagen_url: finalImgUrl 
      }).eq('id', producto.id)

      // 3. Borrar variaciones eliminadas
      const idsActuales = variaciones.filter(v => !v.esNueva).map(v => v.id)
      const idsAEliminar = producto.variaciones.filter(v => !idsActuales.includes(v.id)).map(v => v.id)
      if (idsAEliminar.length > 0) {
        await supabase.from('inventario').delete().in('id', idsAEliminar)
      }

      // 4. Actualizar/Insertar variaciones
      const promesas = variaciones.map(v => {
        const payload = { talla: v.talla, color: v.color, cantidad_disponible: v.cant }
        return v.esNueva 
          ? supabase.from('inventario').insert({ ...payload, producto_id: producto.id })
          : supabase.from('inventario').update(payload).eq('id', v.id)
      })

      await Promise.all(promesas)
      onUpdate()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* PANEL IZQUIERDO: IMAGEN Y DATOS BASE */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 border-r border-slate-100 overflow-y-auto">
          
          {/* CONTENEDOR DE IMAGEN CON HOVER PARA CAMBIAR */}
          <div 
            className="group relative aspect-square rounded-[2.5rem] overflow-hidden mb-6 shadow-xl border-4 border-white cursor-pointer"
            onClick={() => fileInputRef.current.click()}
          >
            <img src={imgUrl} className="w-full h-full object-cover transition-all group-hover:scale-110 group-hover:brightness-50" alt="preview" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={32} className="mb-2" />
              <span className="font-black text-[10px] uppercase tracking-widest text-center px-4">Cambiar Imagen del Modelo</span>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Modelo</label>
              <input 
                type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full mt-1 px-6 py-4 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
              <select 
                value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full mt-1 px-6 py-4 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-blue-100"
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            
            <div className="p-4 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">Referencia</p>
                <p className="text-sm font-black">{producto.codigo_ref}</p>
              </div>
              <Hash className="opacity-20" size={24} />
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: TALLAS */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Edición de <span className="text-blue-600">Almacén</span></h2>
            <button onClick={agregarVariacion} className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all group">
              <PlusCircle size={16} /> Agregar Talla
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {variaciones.map((v, idx) => (
              <div key={v.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase px-2 text-center">Talla</span>
                  <input type="number" value={v.talla} onChange={(e) => handleVariacionChange(idx, 'talla', e.target.value)} className="w-16 h-12 bg-white rounded-xl border-none text-center font-black text-slate-900" />
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase px-2">Color</span>
                  <input type="text" value={v.color} onChange={(e) => handleVariacionChange(idx, 'color', e.target.value)} className="w-full h-12 bg-white rounded-xl border-none px-4 font-bold text-xs uppercase" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase px-2 text-center">Existencia</span>
                  <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 h-12">
                    <button onClick={() => handleVariacionChange(idx, 'cant', Math.max(0, v.cant - 1))} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Minus size={14} /></button>
                    <span className="px-3 font-black text-slate-900 min-w-[35px] text-center">{v.cant}</span>
                    <button onClick={() => handleVariacionChange(idx, 'cant', v.cant + 1)} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"><Plus size={14} /></button>
                  </div>
                </div>

                <button onClick={() => removerVariacion(idx)} className="p-3 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cerrar</button>
            <button 
              onClick={guardarCambios} disabled={loading}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? "Sincronizando..." : <><Save size={18}/> Guardar Todo</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}