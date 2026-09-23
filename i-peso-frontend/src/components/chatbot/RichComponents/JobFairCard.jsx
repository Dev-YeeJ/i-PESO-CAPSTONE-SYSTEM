import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function JobFairCard({ fairs }) {
  if (!fairs || fairs.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 my-4 w-full">
      {fairs.map((fair, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1, duration: 0.3 }}
          className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 overflow-hidden"
        >
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-900 text-sm">{fair.title}</h4>
              <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Event
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{fair.description}</p>
            
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-700 mb-4">
              <div className="flex items-start">
                <Calendar size={14} className="mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Date: </span>
                  {fair.starts} {fair.starts !== fair.ends && `to ${fair.ends}`}
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock size={14} className="mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Time: </span>
                  {fair.time || 'TBA'}
                </div>
              </div>

              <div className="flex items-start">
                <MapPin size={14} className="mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Venue: </span>
                  {fair.venue || fair.full_address}
                </div>
              </div>

              {fair.what_to_bring && fair.what_to_bring.length > 0 && (
                <div className="flex items-start">
                  <FileText size={14} className="mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Bring: </span>
                    <span className="text-gray-500">{fair.what_to_bring.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 pt-3 border-t border-blue-50 flex justify-end">
              <Link 
                to="/job-fairs" 
                target="_blank"
                className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                View Details & Register
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
