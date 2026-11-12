import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import governmentProgramService from '@/services/governmentProgramService';
import PublicProgramCard from '@/components/government-programs/PublicProgramCard';
import PublicAnnouncementsSection from '@/components/announcements/PublicAnnouncementsSection';
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileBadge,
  FileSearch,
  Landmark,
  MapPin,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import IPesoLogo from '@/components/branding/IPesoLogo';
import { useSiteContent } from '@/components/site-content/useSiteContent';
import LandingFaqSection from '@/components/site-content/LandingFaqSection';
import { telHref } from '@/components/site-content/siteContentDefaults';
import {
  FEATURE_CARD_CLASS,
  FeatureCardContent,
  HeroBadgeIcon,
  HeroHeadlineContent,
  HeroHighlights,
  HeroSubheadlineContent,
} from '@/components/site-content/LandingBlocks';


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
  // Text PESO staff edit in Site Content → Landing page / Office info.
  // Falls back to the built-in wording, so the page is never blank.
  const { landing, office, featuredFaqs } = useSiteContent();
  // Sections staff switched off in Content Modules → Landing page (the hero always shows).
  const show = { announcements: true, features: true, jobs: true, programs: true, faq: true, ...(landing.show_sections ?? {}) };
  const [activeTab, setActiveTab] = useState('seeker');
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programsFailed, setProgramsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    governmentProgramService.publicPrograms()
      .then((data) => { if (!cancelled) setPrograms(data || []); })
      .catch(() => { if (!cancelled) setProgramsFailed(true); })
      .finally(() => { if (!cancelled) setProgramsLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

  // For the dashboard interior stagger
  const dashContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const dashItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
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
          {show.features && <a href="#features" className="hover:text-white transition-colors">Features</a>}
          {show.jobs && <a href="#jobs" className="hover:text-white transition-colors">Discovery</a>}
          {show.programs && <a href="#programs" className="hover:text-white transition-colors">Programs</a>}
          <Link to="/about" className="hover:text-white transition-colors">About PESO</Link>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/login')}
            className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <Motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            Register <span className="text-lg leading-none">→</span>
          </Motion.button>
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
              <HeroBadgeIcon />
              {landing.hero_badge}
            </span>
          </Motion.div>

          <Motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            <HeroHeadlineContent landing={landing} />
          </Motion.h1>

          <Motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed">
            <HeroSubheadlineContent landing={landing} />
          </Motion.p>

          <Motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mb-14">
            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register/seeker')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Find Jobs <span className="text-xs font-medium text-slate-500 ml-1">Job Seeker</span>
            </Motion.button>

            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register/employer')}
              className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:bg-yellow-300 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              Post Jobs <span className="text-xs font-medium text-slate-700 ml-1">Employer</span>
            </Motion.button>
          </Motion.div>

          <Motion.div variants={itemVariants}>
            <HeroHighlights landing={landing} />
          </Motion.div>

          {/* Interactive Dashboard Preview Graphic */}
          <Motion.div 
            variants={itemVariants}
            className="mt-16 md:mt-24 relative w-full max-w-4xl mx-auto hidden md:block"
          >
            {/* Interactive Toggle */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 flex items-center bg-[#0D1F38] border border-white/10 rounded-full p-1 shadow-2xl">
              <button 
                onClick={() => setActiveTab('seeker')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'seeker' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Seeker View
              </button>
              <button 
                onClick={() => setActiveTab('employer')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'employer' ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'text-slate-400 hover:text-white'}`}
              >
                Employer View
              </button>
            </div>

            {/* The main dashboard window */}
            <div className="relative rounded-t-2xl border border-white/10 border-b-0 bg-[#0D1F38]/80 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[360px]">
               {/* Browser/Window Header */}
               <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-slate-600/80"></div>
                 <div className="w-3 h-3 rounded-full bg-slate-600/80"></div>
                 <div className="w-3 h-3 rounded-full bg-slate-600/80"></div>
               </div>
               
               {/* Dashboard Content - Changes based on active tab */}
               <div className="p-6 relative z-10">
                 <AnimatePresence mode="wait">
                   {activeTab === 'seeker' ? (
                     <Motion.div 
                       key="seeker-view"
                       variants={dashContainerVariants}
                       initial="hidden"
                       animate="visible"
                       exit="exit"
                       className="grid grid-cols-3 gap-6 text-left"
                     >
                       {/* Seeker Left Sidebar Mock */}
                       <div className="col-span-1 space-y-4">
                          <Motion.div variants={dashItemVariants} className="h-8 w-3/4 rounded-lg bg-white/10 mb-8"></Motion.div>
                          <Motion.div variants={dashItemVariants} className="flex items-center gap-3">
                             <div className="w-4 h-4 rounded bg-blue-400/50"></div>
                             <div className="h-3 w-1/2 rounded bg-white/10"></div>
                          </Motion.div>
                          <Motion.div variants={dashItemVariants} className="flex items-center gap-3 opacity-60">
                             <div className="w-4 h-4 rounded bg-white/5"></div>
                             <div className="h-3 w-2/3 rounded bg-white/5"></div>
                          </Motion.div>
                          
                          <Motion.div variants={dashItemVariants} className="mt-8 pt-6 border-t border-white/5">
                            <div className="h-28 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 p-4 relative overflow-hidden flex flex-col justify-center">
                               <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/20 blur-2xl rounded-full"></div>
                               <div className="text-[10px] text-blue-300 font-bold mb-1 uppercase tracking-wider">Your Match Score</div>
                               <div className="text-4xl font-extrabold text-white">98<span className="text-xl text-slate-400">%</span></div>
                            </div>
                          </Motion.div>
                       </div>
                       
                       {/* Seeker Main Content Mock */}
                       <div className="col-span-2 space-y-4">
                          <div className="flex gap-4 mb-6">
                             <Motion.div variants={dashItemVariants} className="h-28 flex-1 rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between transition-colors hover:bg-white/10">
                                <div className="flex justify-between items-start">
                                   <div className="h-10 w-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                                      <Target className="text-yellow-400 w-5 h-5"/>
                                   </div>
                                   <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">New Match</div>
                                </div>
                                <div>
                                  <div className="h-3 w-2/3 rounded bg-white/20 mb-2"></div>
                                  <div className="h-2 w-1/3 rounded bg-white/10"></div>
                                </div>
                             </Motion.div>
                             <Motion.div variants={dashItemVariants} className="h-28 flex-1 rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between transition-colors hover:bg-white/10">
                                 <div className="flex justify-between items-start">
                                   <div className="h-10 w-10 rounded-lg bg-blue-400/20 flex items-center justify-center">
                                        <Landmark className="text-blue-400 w-5 h-5"/>
                                     </div>
                                 </div>
                                 <div>
                                  <div className="h-3 w-1/2 rounded bg-white/20 mb-2"></div>
                                  <div className="h-2 w-2/3 rounded bg-white/10"></div>
                                </div>
                             </Motion.div>
                          </div>
                          
                          <div className="space-y-3">
                             <Motion.div variants={dashItemVariants} className="h-16 w-full rounded-xl bg-white/5 border border-white/10 flex items-center px-4 gap-4 transition-colors hover:bg-white/10">
                                <div className="h-10 w-10 rounded-full bg-slate-700"></div>
                                <div className="space-y-2 flex-1">
                                   <div className="h-3 w-1/3 rounded bg-white/20"></div>
                                   <div className="h-2 w-1/4 rounded bg-white/10"></div>
                                </div>
                                <div className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 text-xs font-bold shadow-[0_0_15px_rgba(250,204,21,0.2)]">Apply Now</div>
                             </Motion.div>
                             <Motion.div variants={dashItemVariants} className="h-16 w-full rounded-xl bg-white/5 border border-white/10 flex items-center px-4 gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-700"></div>
                                <div className="space-y-2 flex-1">
                                   <div className="h-3 w-1/4 rounded bg-white/20"></div>
                                   <div className="h-2 w-1/3 rounded bg-white/10"></div>
                                </div>
                                <div className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-bold">Viewed</div>
                             </Motion.div>
                          </div>
                       </div>
                     </Motion.div>
                   ) : (
                     <Motion.div 
                       key="employer-view"
                       variants={dashContainerVariants}
                       initial="hidden"
                       animate="visible"
                       exit="exit"
                       className="grid grid-cols-3 gap-6 text-left"
                     >
                       {/* Employer Left Sidebar Mock */}
                       <div className="col-span-1 space-y-4">
                          <Motion.div variants={dashItemVariants} className="h-8 w-3/4 rounded-lg bg-white/10 mb-8"></Motion.div>
                          <Motion.div variants={dashItemVariants} className="flex items-center gap-3 opacity-60">
                             <div className="w-4 h-4 rounded bg-white/5"></div>
                             <div className="h-3 w-1/2 rounded bg-white/5"></div>
                          </Motion.div>
                          <Motion.div variants={dashItemVariants} className="flex items-center gap-3">
                             <div className="w-4 h-4 rounded bg-yellow-400/50"></div>
                             <div className="h-3 w-2/3 rounded bg-white/10"></div>
                          </Motion.div>
                          
                          <Motion.div variants={dashItemVariants} className="mt-8 pt-6 border-t border-white/5">
                            <div className="h-28 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-white/5 p-4 relative overflow-hidden flex flex-col justify-center">
                               <div className="absolute -right-4 -top-4 w-20 h-20 bg-yellow-500/20 blur-2xl rounded-full"></div>
                               <div className="text-[10px] text-yellow-300 font-bold mb-1 uppercase tracking-wider">Active Applicants</div>
                               <div className="text-4xl font-extrabold text-white">42</div>
                            </div>
                          </Motion.div>
                       </div>
                       
                       {/* Employer Main Content Mock */}
                       <div className="col-span-2 space-y-3">
                          <Motion.div variants={dashItemVariants} className="mb-4">
                            <div className="text-sm font-bold text-white mb-2">Top Ranked Applicants</div>
                            <div className="h-1 w-full bg-white/5 rounded"></div>
                          </Motion.div>
                          {[95, 88, 72].map((score, i) => (
                            <Motion.div variants={dashItemVariants} key={i} className="h-16 w-full rounded-xl bg-white/5 border border-white/10 flex items-center px-4 gap-4 transition-colors hover:bg-white/10">
                              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center border border-emerald-400/30">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div className="space-y-2 flex-1">
                                 <div className="h-3 w-1/3 rounded bg-white/20"></div>
                                 <div className="h-2 w-1/4 rounded bg-white/10"></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-bold text-emerald-400">{score}% Match</div>
                                <div className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 cursor-pointer">Review</div>
                              </div>
                           </Motion.div>
                          ))}
                       </div>
                     </Motion.div>
                   )}
                 </AnimatePresence>
               </div>
               
               {/* Fading bottom edge to blend into background */}
               <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/80 to-transparent z-20 pointer-events-none"></div>
            </div>

            {/* Decorative glows behind the dashboard */}
            <div className="absolute -left-20 top-1/4 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none transition-opacity duration-700" style={{ opacity: activeTab === 'seeker' ? 1 : 0.3 }}></div>
            <div className="absolute -right-20 bottom-1/4 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none transition-opacity duration-700" style={{ opacity: activeTab === 'employer' ? 1 : 0.3 }}></div>
          </Motion.div>
        </Motion.div>
      </main>

      {/* ── Announcements (Public audience; renders nothing when there are none) ── */}
      {show.announcements && (
      <PublicAnnouncementsSection />
      )}

      {/* ── Features ── */}
      {show.features && (
      <Motion.section id="features" {...sectionMotion} className="relative z-10 bg-[#0D1F38] border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">{landing.features_eyebrow}</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                {landing.features_heading}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {landing.features.map((feature, i) => (
                <Motion.div
                  key={`${i}-${feature.title}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={FEATURE_CARD_CLASS}
                >
                  <FeatureCardContent feature={feature} />
                </Motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Motion.section>
      )}

      {/* ── Jobs Discovery ── */}
      {show.jobs && (
      <Motion.section id="jobs" {...sectionMotion} className="relative z-10 bg-[#0A192F] border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto grid items-center gap-14 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Job discovery</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Stop guessing if you are qualified.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              When you complete your NSRP profile, our system scores your skills and experience against every open job. You see the highest matches first, saving you from applying to jobs that aren't a fit.
            </p>
            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register/seeker')}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition-all hover:bg-slate-100"
            >
              Create your profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Motion.button>
          </div>

          <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72" aria-hidden="true">
            {/* Animated Radar Pulses */}
            <Motion.span 
              animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-blue-400/40"
            />
            <Motion.span 
              animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-blue-400/40"
            />
            <Motion.span 
              animate={{ scale: [1, 2.5], opacity: [0.1, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 1.6, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-blue-400/40"
            />
            
            {/* Static Radar Rings */}
            <span className="absolute inset-0 rounded-full border border-white/10" />
            <span className="absolute inset-6 rounded-full border border-white/10" />
            <span className="absolute inset-12 rounded-full border border-blue-400/20" />
            
            {/* Radar Pings / Map Pins */}
            <Motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
              className="absolute left-[30%] top-[38%] flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.6)]" 
            />
            <span className="absolute left-[62%] top-[58%] h-2 w-2 rounded-full bg-slate-500" />
            <span className="absolute left-[70%] top-[30%] h-2 w-2 rounded-full bg-slate-500" />
            <MapPin className="h-8 w-8 text-blue-400 relative z-10" />
          </div>
        </div>
      </Motion.section>
      )}

      {/* ── Programs ── */}
      {show.programs && (
      <Motion.section id="programs" {...sectionMotion} className="relative z-10 bg-[#F8F7F2] px-6 py-24 text-[#0A192F]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45309]">Government programs</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
              DOLE and PESO programs, open right now.
            </h2>
          </div>

          {programsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="animate-pulse rounded-xl border border-[#0A192F]/10 bg-white p-5">
                  <div className="h-2.5 w-12 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#0A192F]/15 bg-white/60 p-8 text-center">
              <p className="text-sm font-semibold text-slate-600">
                {programsFailed
                  ? 'Programs are temporarily unavailable — please check back shortly.'
                  : 'No programs are open for application right now — check back soon or visit the PESO office for updates.'}
              </p>
            </div>
          ) : (
            <Motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {programs.map((program) => (
                <Motion.div variants={itemVariants} key={program.program_id}>
                  <PublicProgramCard program={program} />
                </Motion.div>
              ))}
            </Motion.div>
          )}

          <p className="mt-8 text-sm text-slate-600">
            Every program above is free and applied for in person at the PESO office.{' '}
            <button onClick={() => navigate('/register/seeker')} className="font-bold text-[#0A192F] underline decoration-[#B45309] decoration-2 underline-offset-2 hover:text-[#B45309] transition-colors">
              Register to check which ones you qualify for
            </button>{' '}
            before you make the trip.
          </p>
        </div>
      </Motion.section>
      )}

      {show.faq && (
      <LandingFaqSection faqs={featuredFaqs} office={office} />
      )}

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 bg-[#071122] px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
              <IPesoLogo className="h-full w-full" />
            </div>
            <div>
              <p className="font-bold leading-none text-white">i-PESO</p>
              <p className="mt-1 text-xs text-slate-500">{landing.footer_tagline}</p>
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
                {show.features && <a href="#features" className="hover:text-white transition-colors">Features</a>}
                {show.jobs && <a href="#jobs" className="hover:text-white transition-colors">Discovery</a>}
                {show.programs && <a href="#programs" className="hover:text-white transition-colors">Programs</a>}
                <Link to="/about" className="hover:text-white transition-colors">About PESO</Link>
                <Link to="/help" className="hover:text-white transition-colors">Help &amp; FAQs</Link>
              </div>
            </div>
            {(office.address || office.phone || office.email || office.hours) && (
              <div className="max-w-xs">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Visit or contact PESO</p>
                <div className="mt-2.5 flex flex-col gap-2 text-slate-400">
                  {office.address && <span>{office.address}</span>}
                  {office.hours && <span>{office.hours}</span>}
                  {office.phone && <a href={telHref(office.phone)} className="hover:text-white transition-colors">{office.phone}</a>}
                  {office.email && <a href={`mailto:${office.email}`} className="break-all hover:text-white transition-colors">{office.email}</a>}
                  {office.facebook && <a href={office.facebook} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook page</a>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-10 flex flex-col gap-3 border-t border-white/5 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>{landing.footer_tagline} · Pangasinan, Philippines</p>
          <div className="flex items-center gap-3">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
