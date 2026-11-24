import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companyLogoUrl } from '@/utils/companyLogoUrl'

const SIZES = { sm: 'h-10 w-10', md: 'h-12 w-12' }

/** The company's logo, or a building tile when it has none or the image fails to load. */
export default function CompanyLogo({ logo, name, size = 'sm', className }) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : companyLogoUrl(logo)
  const sizeClass = SIZES[size] ?? SIZES.sm

  if (src) {
    return (
      <img
        src={src}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className={cn(sizeClass, 'shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1', className)}
      />
    )
  }

  return (
    <span data-testid="company-logo-fallback" className={cn(sizeClass, 'flex shrink-0 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy', className)} aria-hidden="true">
      <Building2 className="h-5 w-5" />
    </span>
  )
}
