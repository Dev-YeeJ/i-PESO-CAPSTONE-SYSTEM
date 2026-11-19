/**
 * Plain page header used across the portals: an h1, a one-line explanation,
 * optional chips above the title, and the page's single primary action on
 * the right. Replaces the older gradient "hero" banners.
 */
export default function PortalPageHeader({ title, subtitle, chips = null, children = null }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {chips && <div className="mb-3 flex flex-wrap items-center gap-2">{chips}</div>}
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[70ch] text-[15px] leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
