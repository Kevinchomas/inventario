export default function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <input 
        className="w-full bg-white border border-slate-200 p-3 rounded-app focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all placeholder:text-slate-300 text-brand-dark shadow-sm"
        {...props}
      />
    </div>
  )
}