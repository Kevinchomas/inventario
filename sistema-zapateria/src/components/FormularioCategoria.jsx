import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './ui/Button'
import Input from './ui/Input'

export default function FormularioCategoria({ onCategoriaCreada }) {
  const [nombre, setNombre] = useState('')
  const [categorias, setCategorias] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    fetchCategorias()
  }, [])

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nombre')
    setCategorias(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    
    setCargando(true)
    const { error } = await supabase.from('categorias').insert([{ nombre }])
    
    if (error) {
      alert("Error: " + error.message)
    } else {
      setNombre('')
      fetchCategorias()
      if (onCategoriaCreada) onCategoriaCreada()
    }
    setCargando(false)
  }

  async function eliminarCategoria(id) {
    if (!confirm("¿Seguro? Si hay productos en esta categoría, no podrás eliminarla.")) return
    
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) alert("No se puede eliminar: tiene productos asociados.")
    else fetchCategorias()
  }

  async function guardarEdicion(id) {
    const { error } = await supabase.from('categorias').update({ nombre: nuevoNombre }).eq('id', id)
    if (!error) {
      setEditandoId(null)
      fetchCategorias()
    }
  }

  return (
    <div className="bg-white p-6 rounded-app shadow-sm border border-slate-100 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input 
              label="NUEVA CATEGORÍA" 
              placeholder="Ej: Botines, Sandalias..." 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <Button type="submit" variant="dark" disabled={cargando}>
            {cargando ? '...' : 'Añadir'}
          </Button>
        </div>
      </form>

      <hr className="border-slate-100" />

      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestionar Existentes</p>
        <div className="max-height-[300px] overflow-y-auto space-y-2 pr-2">
          {categorias.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
              {editandoId === cat.id ? (
                <input 
                  className="flex-1 bg-white border border-brand-primary rounded-md px-2 py-1 text-sm focus:outline-none"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  autoFocus
                  onBlur={() => guardarEdicion(cat.id)}
                  onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(cat.id)}
                />
              ) : (
                <span className="text-sm font-bold text-slate-700">{cat.nombre}</span>
              )}

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditandoId(cat.id); setNuevoNombre(cat.nombre); }}
                  className="text-blue-500 hover:text-blue-700 text-xs font-bold"
                >
                  EDITAR
                </button>
                <button 
                  onClick={() => eliminarCategoria(cat.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-bold"
                >
                  BORRAR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}