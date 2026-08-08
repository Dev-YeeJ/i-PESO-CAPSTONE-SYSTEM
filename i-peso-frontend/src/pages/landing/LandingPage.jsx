import { useNavigate } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Landmark,
  MapPin,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import IPesoLogo from '@/components/branding/IPesoLogo';

// Real i-PESO government programs — mirrors the live catalogue in
// GovernmentProgram (visibility=public, program_status=open). Hardcoded
// rather than fetched: this endpoint isn't exposed to guests, and the
// program list changes rarely enough that static, verified copy beats an
// extra unauthenticated API surface for a landing page.
const PROGRAMS = [
  { tag: 'SPES', name: 'SPES 2026 Application', blurb: 'Paid work for students and out-of-school youth during the school break.' },
  { tag: 'TUPAD', name: 'TUPAD Assistance Program', blurb: 'Short-term emergency employment for displaced or underemployed workers.' },
  { tag: 'GIP', name: 'Government Internship Program', blurb: 'Paid internships for youth aged 18–30 from low-income households.' },
  { tag: 'OFW', name: 'DOLE-AKAP for OFWs', blurb: 'Cash assistance for distressed, displaced, or returning OFWs.' },
  { tag: 'TESDA', name: 'SMAW NC II Training', blurb: 'Free welding and metal fabrication certification.' },
  { tag: 'TESDA', name: 'Bread and Pastry Production NC II', blurb: 'Free baking certification for aspiring food entrepreneurs.' },
  { tag: 'LIVELIHOOD', name: 'Livelihood Starter Kit', blurb: 'Starter support for a small business or livelihood project.' },
  { tag: 'GUIDANCE', name: 'Career Guidance Seminar', blurb: 'Sessions for students, first-time job seekers, and career shifters.' },
];

const FEATURES = [
  {
    icon: Target,
    title: 'Skill-tag matching',
    body: 'Search by skill, distance, and match score — not just a job title keyword.',
  },
  {
    icon: Landmark,
    title: 'Government programs',
    body: 'Apply to SPES, TUPAD, and other DOLE programs from the same account, no second form.',
  },
  {
    icon: CalendarDays,
    title: 'Job fairs',
    body: 'RSVP to local job fairs and get a digital pass — no printed form to lose.',
  },
  {
    icon: Sparkles,
    title: 'Assistant',
    body: 'Ask a question in Tagalog or English, anytime — answers come from real listings, not guesses.',
  },
];

const SEEKER_STEPS = [
  { title: 'Register and verify', body: 'Create your account and complete your NSRP profile.' },
  { title: 'Get matched', body: 'We score openings by your skills, location, and preferences.' },
  { title: 'Apply and attend', body: 'Apply to jobs, join job fairs, or enrol in a program.' },
];

const EMPLOYER_STEPS = [
  { title: 'Register and verify', body: 'Submit your business documents for PESO review.' },
  { title: 'Post openings', body: 'List positions with the skills and location you need.' },
  { title: 'Review and hire', body: 'Screen applicants and schedule interviews in one place.' },
];

function useSectionMotion() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return {};
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: 'easeOut' },
  };
}

const LandingPage = () => {
  const navigate = useNavigate();
  const sectionMotion = useSectionMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white overflow-hidden relative font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      <Motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 px-8 py-5 flex items-center justify-between max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-500/20">
            <IPesoLogo className="h-full w-full" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none tracking-wide text-white">i-PESO</p>
            <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wider mt-1">Urdaneta City</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          <a href="#jobs" className="hover:text-white transition-colors">Jobs</a>
          <a href="#programs" className="hover:text-white transition-colors">Programs</a>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/login')}
            className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            Register <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </Motion.nav>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center max-w-5xl mx-auto min-h-[80vh]">
        <Motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          <Motion.div variants={itemVariants} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm text-xs font-medium text-slate-300">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Urdaneta City PESO Employment Portal
            </span>
          </Motion.div>

          <Motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Find Your <span className="relative inline-block text-yellow-400">
              Perfect Match
              <svg className="absolute w-full h-4 -bottom-1 left-0 text-yellow-500/80" viewBox="0 0 200 9" fill="none">
                <path d="M2.00035 7.15854C47.0142 3.12519 123.633 -1.25883 198.056 4.54226" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span> <br />
            Powered by Smart Technology
          </Motion.h1>

          <Motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed">
            Browse job openings, join local job fairs, and apply to government programs like SPES and
            TUPAD — all from one <span className="text-white font-medium">i-PESO</span> account.
          </Motion.p>

          <Motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mb-14">
            <button
              onClick={() => navigate('/register/seeker')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Find Jobs <span className="text-xs font-medium text-slate-500 ml-1">Job Seeker</span>
            </button>

            <button
              onClick={() => navigate('/register/employer')}
              className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:bg-yellow-300 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              Post Jobs <span className="text-xs font-medium text-slate-700 ml-1">Employer</span>
            </button>
          </Motion.div>

          <Motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Free to Use
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Skill-Tag Matching
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 8 Government Programs
            </span>
          </Motion.div>
        </Motion.div>
      </main>

      {/* ── Features ── */}
      <Motion.section id="features" {...sectionMotion} className="relative z-10 bg-[#0D1F38] border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">What you get</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              One account, the whole employment process.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Motion.section>

      {/* ── How it works ──
          A two-sided marketplace gets a two-track process, not a generic
          linear list — it mirrors the seeker/employer split the app already
          makes at the very first registration screen. */}
      <Motion.section id="how-it-works" {...sectionMotion} className="relative z-10 bg-[#0A192F] border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16 text-center mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">How it works</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Two paths. One place they meet.
            </h2>
          </div>

          <div className="relative grid gap-10 md:grid-cols-2 md:gap-16">
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-white/0 via-white/15 to-white/0 md:block" />

            <div>
              <p className="mb-6 text-sm font-bold uppercase tracking-wide text-blue-300">Job Seeker</p>
              <ol className="space-y-6">
                {SEEKER_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-mono text-sm font-medium text-blue-300/70 pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="font-bold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="mb-6 text-sm font-bold uppercase tracking-wide text-yellow-400">Employer</p>
              <ol className="space-y-6">
                {EMPLOYER_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-mono text-sm font-medium text-yellow-400/70 pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="font-bold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-14 flex items-center justify-center gap-3 text-sm font-bold text-white">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/30" />
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Matched, hired, working
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/30" />
          </div>
        </div>
      </Motion.section>

      {/* ── Jobs ──
          The live database has no active listings yet, so this section
          describes the real discovery mechanism instead of faking job
          cards. Map access is seeker-gated; the assistant is not — say so
          plainly rather than overclaiming what a guest can do here. */}
      <Motion.section id="jobs" {...sectionMotion} className="relative z-10 bg-[#0D1F38] border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto grid items-center gap-14 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">Job discovery</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Find work near you, matched to what you can do.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Ask the assistant what&apos;s open right now — no account needed. Register to unlock
              the interactive map, with distance and skill-match scoring on every listing.
            </p>
            <button
              onClick={() => navigate('/register/seeker')}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition-all hover:bg-slate-100"
            >
              Register to browse the map <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72" aria-hidden="true">
            <span className="absolute inset-0 rounded-full border border-white/10" />
            <span className="absolute inset-6 rounded-full border border-white/10" />
            <span className="absolute inset-12 rounded-full border border-yellow-400/20" />
            <span className="absolute left-[30%] top-[38%] flex h-3 w-3 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.6)]" />
            <span className="absolute left-[62%] top-[58%] h-2 w-2 rounded-full bg-blue-300" />
            <span className="absolute left-[70%] top-[30%] h-2 w-2 rounded-full bg-blue-300" />
            <MapPin className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </Motion.section>

      {/* ── Programs ──
          Paper band — the one contrast beat in an otherwise all-navy page.
          Real programs from the GovernmentProgram catalogue, presented as
          document tiles: these are actual DOLE/PESO forms, not marketing
          copy, so they get to look like the paperwork they are. */}
      <Motion.section id="programs" {...sectionMotion} className="relative z-10 bg-[#F8F7F2] px-6 py-24 text-[#0A192F]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45309]">Government programs</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
              DOLE and PESO programs, open right now.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAMS.map((program) => (
              <div key={program.name} className="rounded-xl border border-[#0A192F]/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <span className="font-mono text-[10px] font-medium tracking-wide text-[#B45309]">{program.tag}</span>
                <h3 className="mt-2 text-sm font-bold leading-snug text-[#0A192F]">{program.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{program.blurb}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-slate-600">
            Eligibility and open slots vary by program.{' '}
            <button onClick={() => navigate('/register/seeker')} className="font-bold text-[#0A192F] underline decoration-[#B45309] decoration-2 underline-offset-2">
              Register to check yours
            </button>.
          </p>
        </div>
      </Motion.section>

      {/* ── Footer ──
          No street address or phone number: PESO hasn't supplied verified
          contact details yet (see config/peso_knowledge.php). The assistant
          — already on every guest page — is the honest substitute for a
          "contact us" block until that information exists. */}
      <footer className="relative z-10 border-t border-white/5 bg-[#071122] px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
              <IPesoLogo className="h-full w-full" />
            </div>
            <div>
              <p className="font-bold leading-none text-white">i-PESO</p>
              <p className="mt-1 text-xs text-slate-500">Urdaneta City PESO Employment Portal</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Get started</p>
              <div className="mt-2.5 flex flex-col gap-2 text-slate-400">
                <a href="#" onClick={(event) => { event.preventDefault(); navigate('/register/seeker'); }} className="hover:text-white transition-colors">Find a job</a>
                <a href="#" onClick={(event) => { event.preventDefault(); navigate('/register/employer'); }} className="hover:text-white transition-colors">Hire talent</a>
                <a href="#" onClick={(event) => { event.preventDefault(); navigate('/login'); }} className="hover:text-white transition-colors">Sign in</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">On this page</p>
              <div className="mt-2.5 flex flex-col gap-2 text-slate-400">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                <a href="#programs" className="hover:text-white transition-colors">Programs</a>
              </div>
            </div>
            <div className="max-w-[16rem]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions?</p>
              <p className="mt-2.5 flex items-start gap-1.5 text-slate-400">
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Ask the assistant in the corner of this page — it answers from real PESO records.
              </p>
            </div>
          </div>
        </div>

        <p className="max-w-6xl mx-auto mt-10 border-t border-white/5 pt-6 text-xs text-slate-600">
          Urdaneta City PESO Employment Portal · Pangasinan, Philippines
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
