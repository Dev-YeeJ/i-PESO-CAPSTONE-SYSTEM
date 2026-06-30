import React from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function InterviewCalendarPage() {
  const user = useAuthStore((state) => state.user);
  
  // Use the PESO Calendar ID from your Google Calendar settings
  const calendarSrc = encodeURIComponent('8503ccdeffe15262a3f896f79fa2ec0f4583c35f31730efe813cb857835bb552@group.calendar.google.com');

  return (
    <div className="w-full h-[calc(100vh-76px)] -m-4 sm:-m-6 lg:-m-8">
      {user?.email ? (
        <iframe 
          src={`https://calendar.google.com/calendar/embed?src=${calendarSrc}&ctz=Asia%2FManila&showTitle=0&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23ffffff&color=%230284c7`} 
          style={{ border: 0 }} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no"
          title="Google Calendar"
          className="w-full h-full block"
        ></iframe>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p className="font-medium">Loading calendar interface...</p>
        </div>
      )}
    </div>
  );
}
