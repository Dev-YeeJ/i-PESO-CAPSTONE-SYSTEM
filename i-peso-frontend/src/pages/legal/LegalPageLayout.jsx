import { ChevronRight, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '@/components/landing/PublicChrome';

export function PolicySection({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-slate-200 py-10 first:pt-0 last:border-0">
      <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
        <span className="mr-2 text-[#2563b8] tabular-nums">{number}.</span>{title}
      </h2>
      <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-slate-700">{children}</div>
    </section>
  );
}

export function ConfirmNote({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-400 bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-amber-900">
      <span className="mr-2 rounded-full bg-brand-gold px-2 py-0.5 text-xs font-bold text-brand-navy">
        PESO to confirm
      </span>
      {children}
    </div>
  );
}

/**
 * Shared chrome for the policy pages: a contents list on the left, the
 * document in a readable column, and the version facts (effective date,
 * version history, print) on the right. `children` renders the
 * PolicySection list; `after` is the version list.
 */
export default function LegalPageLayout({ badge, badgeIcon: BadgeIcon, title, description, effectiveDate, sections, crossLink, notice = null, after = null, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
      <PublicHeader />

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-12 xl:grid-cols-[220px_minmax(0,1fr)_260px] xl:gap-12">
        {sections.length > 0 && (
          <nav className="hidden self-start lg:sticky lg:top-24 lg:block print:hidden" aria-label="On this page">
            <p className="px-3 pb-2 text-sm font-semibold text-slate-900">On this page</p>
            <ol className="space-y-0.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-[#e8f0fc] hover:text-brand-navy">{section.label}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <article className="min-w-0">
          <nav className="flex items-center gap-2 text-sm text-slate-500 print:hidden" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-brand-navy">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            <span className="text-slate-900" aria-current="page">{title}</span>
          </nav>
          {badge && (
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#e8f0fc] px-3 py-1 text-sm font-medium text-brand-navy">
              {BadgeIcon && <BadgeIcon className="h-4 w-4" aria-hidden="true" />}
              {badge}
            </span>
          )}
          <h1 className="mt-4 font-display text-[40px] leading-[1.08] text-brand-navy sm:text-[48px]">{title}</h1>
          <p className="mt-4 max-w-[64ch] text-lg leading-8 text-slate-700">{description}</p>
          <p className="mt-2 text-sm text-slate-500 xl:hidden">Effective {effectiveDate}</p>

          {/* Mobile contents: the sticky list is hidden below lg. */}
          {sections.length > 0 && (
            <details className="mt-6 rounded-xl border border-slate-200 bg-brand-canvas p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">On this page</summary>
              <ol className="mt-3 space-y-1.5 text-sm">
                {sections.map((section) => (
                  <li key={section.id}><a href={`#${section.id}`} className="text-brand-navy hover:underline">{section.label}</a></li>
                ))}
              </ol>
            </details>
          )}

          <div className="mt-10 max-w-[68ch]">
            {/* Version notices from Site Content → Policy pages (an upcoming or older version). */}
            {notice}
            {children}
          </div>
          <div className="mt-10 max-w-[68ch]">{after}</div>
        </article>

        <aside className="hidden space-y-5 self-start xl:sticky xl:top-24 xl:block print:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <dl className="text-sm">
              <dt className="text-slate-500">Effective</dt>
              <dd className="font-semibold text-slate-900">{effectiveDate}</dd>
            </dl>
            <button type="button" onClick={() => window.print()} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand-navy text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc]">
              <Printer className="h-4 w-4" aria-hidden="true" /> Print or save as PDF
            </button>
            {crossLink && (
              <Link to={crossLink.to} className="mt-3 block text-center text-sm font-semibold text-brand-navy hover:underline">Read the {crossLink.label}</Link>
            )}
          </div>
        </aside>
      </main>

      <PublicFooter />
    </div>
  );
}
