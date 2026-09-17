import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('peso_cookie_consent');
    if (!cookieConsent) {
      // Small delay for a nice entrance animation
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('peso_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Note: depending on local laws, you might need to handle actual cookie blocking here
    localStorage.setItem('peso_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fade-in-up">
      <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-6 md:flex md:items-center md:justify-between gap-6">
        
        {/* Text Section */}
        <div className="flex-1 mb-4 md:mb-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            🍪 We value your privacy
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic on the PESO Employment Information System. By clicking "Accept All", you consent to our use of cookies.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-col sm:flex-row gap-3 min-w-[280px]">
          <button
            onClick={handleDecline}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-4 focus:ring-slate-100"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 focus:ring-4 focus:ring-blue-100"
          >
            Accept All
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default CookieConsent;
