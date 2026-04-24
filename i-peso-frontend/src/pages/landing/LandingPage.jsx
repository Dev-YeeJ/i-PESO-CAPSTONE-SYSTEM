// i-peso-frontend/src/pages/landing/LandingPage.jsx
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 leading-none">i-PESO</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Urdaneta City</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
        <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
          Official PESO Digital Portal — Urdaneta City
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-5">
          Connecting talent to <br />
          <span className="text-blue-700">opportunity</span>, digitally.
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-14 leading-relaxed">
          The official employment facilitation platform of the Urdaneta City Public Employment Service Office. Smart job matching, government programs, and real-time labor market data.
        </p>

        {/* ── DUAL CTA CARDS ── */}
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">

          {/* Job Seeker CTA */}
          <div className="group relative bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-8 text-left shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => navigate('/register', { state: { preselectedRole: 'seeker' } })}
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="w-1 h-6 bg-green-500 rounded-full absolute top-0 left-0 mt-8 ml-0 rounded-l-none" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">I'm looking for work</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Search local jobs, track your applications, and apply to DOLE government programs — all in one place.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 group-hover:gap-3 transition-all">
              Find jobs
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>

          {/* Employer CTA */}
          <div className="group relative bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-8 text-left shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => navigate('/register', { state: { preselectedRole: 'employer' } })}
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">I want to hire talent</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Post vacancies, manage your applicant pipeline, and schedule interviews through your employer dashboard.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:gap-3 transition-all">
              Post a job
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </div>

        {/* Mobile app hint */}
        <p className="mt-6 text-sm text-slate-400">
          Job seekers — also available on{' '}
          <span className="font-medium text-slate-600">Android</span>.
          Download the i-PESO mobile app.
        </p>
      </section>

      {/* ── STATS ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-100">
          {[
            { label: 'Registered job seekers', value: '2,400+' },
            { label: 'Active vacancies', value: '380+' },
            { label: 'Partner employers', value: '140+' },
            { label: 'Placements this year', value: '960+' },
          ].map((stat) => (
            <div key={stat.label} className="pl-6 first:pl-0">
              <p className="text-2xl font-bold text-blue-700">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">© 2025 Urdaneta City PESO — i-PESO System</p>
          <div className="flex gap-4">
            {['Privacy Policy', 'Terms of Use', 'DOLE Philippines'].map((link) => (
              <span key={link} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">{link}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage