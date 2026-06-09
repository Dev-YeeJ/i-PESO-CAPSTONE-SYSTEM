import { Link } from 'react-router-dom'

export default function BrandMark({ light = false, compact = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <span className={`flex shrink-0 items-center justify-center rounded-xl font-black shadow-sm ${
        light ? 'bg-brand-gold text-brand-navy' : 'bg-blue-900 text-white'
      } ${compact ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'}`}>
        iP
      </span>
      <span>
        <span className={`block font-extrabold leading-none ${compact ? 'text-base' : 'text-lg'} ${light ? 'text-white' : 'text-brand-navy'}`}>i-PESO</span>
        <span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] ${light ? 'text-blue-200' : 'text-slate-500'}`}>Urdaneta City PESO</span>
      </span>
    </Link>
  )
}
