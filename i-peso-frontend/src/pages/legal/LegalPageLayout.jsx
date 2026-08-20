import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import IPesoLogo from '@/components/branding/IPesoLogo';

export function PolicySection({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-[#0A192F]/10 py-10 first:pt-0 last:border-0">
      <h2 className="text-xl font-extrabold tracking-tight text-[#0A192F] sm:text-2xl">
        <span className="mr-2 text-[#B45309]">{number}.</span>{title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}

export function ConfirmNote({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      <span className="mr-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
        PESO to confirm
      </span>
      {children}
    </div>
  );
}

/**
 * Shared chrome for the /privacy-policy and /terms-of-service pages: nav,
 * hero, "on this page" anchor card, light paper body band, and footer.
 * `children` renders the PolicySection list.
 */
export default function LegalPageLayout({ badge, badgeIcon: BadgeIcon, title, description, effectiveDate, sections, crossLink, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A192F] font-sans text-white">
      {/* ── Header ── */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-500/20">
            <IPesoLogo className="h-full w-full" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tracking-wide text-white">i-PESO</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-blue-300">Urdaneta City</p>
          </div>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </nav>

      <header className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-8 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm">
          {BadgeIcon && <BadgeIcon className="h-4 w-4 text-yellow-500" />}
          {badge}
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">{description}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Effective {effectiveDate}
        </p>
      </header>

      {/* ── Body ── */}
      <div className="relative z-10 bg-[#F8F7F2]">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
          <div className="mb-10 rounded-2xl border border-[#0A192F]/10 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">On this page</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`} className="font-semibold text-[#0A192F] underline decoration-[#B45309]/50 decoration-2 underline-offset-2 hover:decoration-[#B45309]">
                  {index + 1}. {section.label}
                </a>
              ))}
            </div>
          </div>

          {children}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 bg-[#071122] px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
            <IPesoLogo className="h-full w-full" />
          </div>
          <p className="text-xs text-slate-500">Urdaneta City PESO Employment Portal · Pangasinan, Philippines</p>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
            <Link to="/" className="underline decoration-[#B45309]/50 underline-offset-2 hover:text-white">
              Back to home
            </Link>
            {crossLink && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <Link to={crossLink.to} className="underline decoration-[#B45309]/50 underline-offset-2 hover:text-white">
                  {crossLink.label}
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
