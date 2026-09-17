import React, { useState, useEffect } from 'react';
import api from '@/services/api';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('peso_cookie_consent');
    if (!cookieConsent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const submitConsent = async (status) => {
    setIsSubmitting(true);
    try {
      await api.post('/cookie-consent', { status });
    } catch (error) {
      console.error('Failed to save cookie consent', error);
    } finally {
      localStorage.setItem('peso_cookie_consent', status);
      setIsVisible(false);
      setIsSubmitting(false);
    }
  };

  const handleAccept = () => submitConsent('accepted');
  const handleDecline = () => submitConsent('declined');

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-fade-in-up flex justify-center md:justify-start pointer-events-none">
      <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl p-5 md:p-6 md:flex md:items-center md:justify-between gap-6 pointer-events-auto ring-1 ring-white/10">
        
        {/* Text Section */}
        <div className="flex-1 mb-5 md:mb-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2 tracking-wide">
            🍪 We value your privacy
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed pr-2">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking <strong className="text-white">"Accept All"</strong>, you consent to our use of cookies on the PESO portal.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-row gap-3 md:flex-col md:w-36 shrink-0">
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 focus:ring-4 focus:ring-amber-500/30 disabled:opacity-50"
          >
            Accept All
          </button>
          <button
            onClick={handleDecline}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all focus:ring-4 focus:ring-slate-700 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default CookieConsent;
