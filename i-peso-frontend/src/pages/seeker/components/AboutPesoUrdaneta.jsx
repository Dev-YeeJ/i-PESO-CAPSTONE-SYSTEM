import { Building2 } from 'lucide-react'

export default function AboutPesoUrdaneta() {
  return (
    <section className="mx-auto mb-4 max-w-[1440px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:mb-5 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">About PESO Urdaneta</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Public Employment Service Office, Urdaneta City</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            PESO Urdaneta connects local job seekers with employers and links them to DOLE and government livelihood
            programs — including SPES, TUPAD, GIP, and OFW assistance — job fairs, and skills training, at no cost.
            This platform is PESO&apos;s digital front door for those services.
          </p>
        </div>
      </div>
    </section>
  )
}
