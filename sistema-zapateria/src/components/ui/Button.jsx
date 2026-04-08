export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    // Azul -> Hover Azul más oscuro (mantiene texto blanco)
    primary: 'bg-brand-primary text-brand-contrast hover:bg-brand-dark shadow-md shadow-brand-primary/20',
    
    // Blanco/Gris -> Hover Gris muy suave (mantiene texto oscuro)
    secondary: 'bg-white text-brand-dark border border-slate-200 hover:bg-slate-100 hover:text-brand-primary',
    
    // Negro -> Hover Azul (Cambia el color al pasar el mouse para que se note la acción)
    dark: 'bg-brand-dark text-brand-contrast hover:bg-brand-primary',
    
    // Especial para botones de acción rápida
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'
  }

  return (
    <button 
      className={`px-6 py-2.5 rounded-app font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}