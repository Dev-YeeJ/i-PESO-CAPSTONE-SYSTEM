import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Smartphone, LineChart, ShieldCheck, ArrowRight, CheckCircle2, Download, Building } from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('seeker');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              iP
            </div>
            <span className="font-bold text-2xl tracking-tight text-blue-900">i-PESO</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition">How it Works</a>
            <Link className="hover:text-blue-600 transition">Login</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/[0.03] -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Real-Time Smart Job Matching Engine
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
            Bridging <span className="text-blue-700">Talent</span> and <span className="text-amber-500">Opportunity</span> in Real-Time.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            The Integrated Multi-Platform Employment System for Urdaneta City. 
            Smart matching, instant notifications, and seamless hiring.
          </p>

          {/* DUAL CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register?role=seeker" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-1"
            >
              <Smartphone size={20} />
              I'm looking for a Job
            </Link>
            <Link 
              to="/register?role=employer" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 hover:border-blue-700 hover:text-blue-700 text-slate-700 rounded-xl font-semibold text-lg transition-all hover:-translate-y-1"
            >
              <Briefcase size={20} />
              I want to Hire Talent
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Powered by Smart Technology</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">i-PESO eliminates the guesswork from hiring with automated algorithms and cross-platform accessibility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<ShieldCheck className="text-amber-500" size={32} />}
              title="Smart Matching"
              desc="Our algorithm automatically ranks applicants based on skills, education, and location parameters."
            />
            <FeatureCard 
              icon={<Smartphone className="text-blue-600" size={32} />}
              title="Mobile First"
              desc="Job seekers get a dedicated Android app with offline SMS notifications for maximum accessibility."
            />
            <FeatureCard 
              icon={<Briefcase className="text-emerald-600" size={32} />}
              title="Employer Portal"
              desc="A comprehensive web dashboard for employers to post jobs, screen applicants, and schedule interviews."
            />
            <FeatureCard 
              icon={<LineChart className="text-purple-600" size={32} />}
              title="Labor Analytics"
              desc="Admins gain real-time insights into employment trends and SPES/TUPAD program statistics."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (TABBED) */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">How i-PESO Works</h2>
            
            {/* Custom Toggle Switch */}
            <div className="inline-flex bg-slate-200 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('seeker')}
                className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'seeker' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                For Job Seekers
              </button>
              <button 
                onClick={() => setActiveTab('employer')}
                className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'employer' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                For Employers
              </button>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
            {activeTab === 'seeker' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <Step number="1" title="Download the App" desc="Install the i-PESO Android app and build your digital resume." />
                <Step number="2" title="Get Matched" desc="Our system automatically matches your skills to local job openings." />
                <Step number="3" title="Apply & Get Hired" desc="Submit applications with one click and receive SMS interview alerts." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <Step number="1" title="Register Company" desc="Create your employer profile via our secure web platform." />
                <Step number="2" title="Post Vacancies" desc="Publish job requirements, required skills, and salary ranges." />
                <Step number="3" title="Screen Top Talent" desc="Review pre-ranked applicants and schedule interviews directly." />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FINAL CTA SPLIT */}
      <section className="bg-blue-900 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your employment journey?</h2>
          <p className="text-blue-200 mb-10 max-w-2xl mx-auto text-lg">Join thousands of job seekers and hundreds of companies actively connecting on i-PESO today.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-amber-950 px-8 py-4 rounded-xl font-bold transition">
              <Download size={20} />
              Download Mobile App
            </button>
            <button className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl font-bold transition">
              <Building size={20} />
              Go to Employer Portal
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-sm text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="font-bold text-2xl text-white tracking-tight mb-4 flex items-center justify-center gap-2">
             <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold text-sm">iP</div>
             i-PESO
          </div>
          <p className="mb-6">Integrated Multi-Platform Employment System <br/> Public Employment Service Office - Urdaneta City</p>
          <div className="flex justify-center gap-6 mb-8">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Admin Portal</a>
          </div>
          <p>&copy; {new Date().getFullYear()} i-PESO Capstone Project. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Sub-components for clean code
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group">
      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-bold mb-6 border-4 border-white shadow-md">
        {number}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{desc}</p>
    </div>
  );
}