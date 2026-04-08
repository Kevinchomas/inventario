import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ZapatoCard from './ZapatoCard'
import Input from './ui/Input'
import Button from './ui/Button'

export default function InventarioGrid({ refreshKey }) {
  const [zapatos, setZapatos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [filtroCat, setFiltroCat] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  async function fetchData() {
  setCargando(true)
  console.log("--- Iniciando carga de inventario ---")

  try {
    const { data: catData, error: catError } = await supabase
      .from('categorias')
      .select('*')
    
    if (catError) throw catError
    setCategorias(catData || [])

    // Eliminamos el .order('created_at') para evitar el error
    const { data: prodData, error: prodError } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (id, nombre),
        inventario (*)
      `)

    if (prodError) {
      console.error("❌ Error de Supabase:", prodError.message)
    } else {
      console.log("✅ Datos recibidos de Supabase:", prodData)
      setZapatos(prodData || [])
    }

  } catch (err) {
    console.error("❌ Error crítico en fetchData:", err.message)
  } finally {
    setCargando(false)
  }
}

  // Lógica de Filtrado Combinado (Usamos == para evitar problemas de tipo UUID/String)
  const zapatosFiltrados = zapatos.filter(z => {
    const nombreLower = z.nombre?.toLowerCase() || ""
    const refLower = z.codigo_ref?.toLowerCase() || ""
    const buscarLower = busqueda.toLowerCase()

    const coincideBusqueda = 
      nombreLower.includes(buscarLower) || 
      refLower.includes(buscarLower)
    
    const coincideCategoria = 
      filtroCat === 'todos' || z.categoria_id == filtroCat

    return coincideBusqueda && coincideCategoria
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input 
              label="Buscador rápido"
              placeholder="Ej: Deportivo Dama o REF-..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            <Button 
              variant={filtroCat === 'todos' ? 'dark' : 'secondary'}
              className="text-xs py-2 px-4 whitespace-nowrap"
              onClick={() => setFiltroCat('todos')}
            >
              Todos
            </Button>
            {categorias.map(cat => (
              <Button
                key={cat.id}
                variant={filtroCat === cat.id ? 'dark' : 'secondary'}
                className="text-xs py-2 px-4 whitespace-nowrap"
                onClick={() => setFiltroCat(cat.id)}
              >
                {cat.nombre}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
           {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-200 rounded-app"></div>)}
        </div>
      ) : zapatosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-app border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold uppercase tracking-widest">
            {zapatos.length === 0 ? "No hay datos en la base de datos" : "No se encontraron modelos con esos filtros"}
          </p>
          <p className="text-xs text-slate-300 mt-2">Revisa la consola (F12) para más detalles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {zapatosFiltrados.map(z => (
            <ZapatoCard 
        key={z.id} 
        zapato={z} 
        onUpdate={fetchData} // Esto hace que al apartar, se pidan los datos nuevos
    />
          ))}
        </div>
      )}
    </div>
  )
}