import { Link } from 'react-router-dom'
import IPesoLogo from '@/components/branding/IPesoLogo'

export default function BrandMark({ light = false, compact = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <IPesoLogo className="h-full w-full" />
      </span>
      <span>
        <span className={`block font-extrabold leading-none ${compact ? 'text-base' : 'text-lg'} ${light ? 'text-white' : 'text-brand-navy'}`}>i-PESO</span>
        <span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] ${light ? 'text-blue-200' : 'text-slate-500'}`}>Urdaneta City PESO</span>
      </span>
    </Link>
  )
}
