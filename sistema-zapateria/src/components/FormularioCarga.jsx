import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generarCodigoAleatorio } from '../utils/helpers'
// Importamos tus nuevos componentes
import Button from './ui/Button'
import Input from './ui/Input'

export default function FormularioCarga({ alGuardar }) {
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [catSeleccionada, setCatSeleccionada] = useState('')
  const [imagen, setImagen] = useState(null)
  const [tallas, setTallas] = useState([{ talla: '', cantidad: '' }])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    obtenerCategorias()
    setCodigo(generarCodigoAleatorio())
  }, [])

  async function obtenerCategorias() {
    const { data } = await supabase.from('categorias').select('*')
    setCategorias(data || [])
  }

  const handleTallaChange = (index, campo, valor) => {
    const nuevasTallas = [...tallas]
    nuevasTallas[index][campo] = valor
    setTallas(nuevasTallas)
  }

  async function guardarProducto(e) {
    e.preventDefault()
    if (!catSeleccionada) return alert("Selecciona categoría")
    setCargando(true)

    try {
      let imagenUrl = ''
      if (imagen) {
        const fileName = `${Date.now()}-${imagen.name}`
        await supabase.storage.from('zapatos').upload(fileName, imagen)
        const { data: urlData } = supabase.storage.from('zapatos').getPublicUrl(fileName)
        imagenUrl = urlData.publicUrl
      }

      const { data: producto, error: pError } = await supabase
        .from('productos')
        .insert([{ 
          nombre: nombre, 
          codigo_ref: codigo, 
          categoria_id: catSeleccionada, 
          imagen_url: imagenUrl 
        }])
        .select()

      if (pError) throw pError

      const inventarioData = tallas.map(t => ({
        producto_id: producto[0].id,
        talla: parseFloat(t.talla),
        cantidad_disponible: parseInt(t.cantidad)
      }))

      await supabase.from('inventario').insert(inventarioData)

      alert("¡Guardado con éxito!")
      
      setNombre(''); setImagen(null); setTallas([{ talla: '', cantidad: '' }])
      setCodigo(generarCodigoAleatorio())
      if(alGuardar) alGuardar()

    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={guardarProducto} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-700 uppercase tracking-tight">👟 Registrar Modelo</h2>
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-mono font-bold border border-blue-100">
          {codigo}
        </span>
      </div>

      <div className="space-y-6">
        {/* Usamos tu componente Input */}
        <Input 
          label="Nombre del Zapato"
          required 
          placeholder="Ej: Botines Bratz con Brillo" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)} 
        />
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-black text-gray-400 uppercase ml-1">Categoría</label>
          <select 
            required 
            className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
            value={catSeleccionada} 
            onChange={e => setCatSeleccionada(e.target.value)}
          >
            <option value="">Seleccionar familia...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-black text-gray-400 uppercase ml-1">Imagen del Modelo</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={e => setImagen(e.target.files[0])} 
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-900 file:text-white hover:file:bg-black cursor-pointer" 
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <label className="text-xs font-black text-gray-400 uppercase mb-3 block">Distribución de Tallas</label>
          {tallas.map((t, index) => (
            <div key={index} className="flex gap-3 mb-3">
              <Input 
                placeholder="Talla" 
                type="number" 
                value={t.talla} 
                onChange={e => handleTallaChange(index, 'talla', e.target.value)} 
              />
              <Input 
                placeholder="Cantidad" 
                type="number" 
                value={t.cantidad} 
                onChange={e => handleTallaChange(index, 'cantidad', e.target.value)} 
              />
            </div>
          ))}
          <Button 
            type="button" 
            variant="secondary" 
            className="w-full py-2 text-xs" 
            onClick={() => setTallas([...tallas, { talla: '', cantidad: '' }])}
          >
            + Añadir Talla
          </Button>
        </div>
      </div>
      <Button 
  type="submit" 
  variant="primary" 
  className="w-full mt-8 py-4" 
  disabled={cargando}
>
  {cargando ? 'PROCESANDO...' : 'FINALIZAR REGISTRO'}
</Button>
    </form>
  )
}