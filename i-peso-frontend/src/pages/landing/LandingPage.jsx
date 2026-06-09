import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();

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
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-extrabold text-white shadow-lg shadow-blue-500/20 tracking-tighter">
            iP
          </div>
          <div>
            <p className="font-bold text-lg leading-none tracking-wide text-white">i-PESO</p>
            <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wider mt-1">Urdaneta City</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <span className="hover:text-white cursor-pointer transition-colors">Features</span>
          <span className="hover:text-white cursor-pointer transition-colors">How it Works</span>
          <span className="hover:text-white cursor-pointer transition-colors">Jobs</span>
          <span className="hover:text-white cursor-pointer transition-colors">Programs</span>
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
              Official DOLE-PESO Platform · Urdaneta City, Pangasinan
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
            <span className="text-white font-medium">i-PESO</span> connects job seekers with employers through intelligent matching, real-time tracking, and seamless communication — all in one government-certified platform.
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
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> DOLE Accredited
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Free to Use
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Skill-Tag Matching
            </span>
          </Motion.div>
        </Motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
