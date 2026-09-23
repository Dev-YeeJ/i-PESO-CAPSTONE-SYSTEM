import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Building, Clock, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import MatchScoreCard from './MatchScoreCard';

export default function JobCardList({ jobs, onJobSelected }) {
  if (!jobs || jobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 my-4 w-full">
      {jobs.map((job, idx) => (
        <JobCard 
          key={job.post_id || idx} 
          job={job} 
          idx={idx} 
          onJobSelected={onJobSelected}
        />
      ))}
    </div>
  );
}

function JobCard({ job, idx, onJobSelected }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1, duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => {
          if (onJobSelected) onJobSelected(job);
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm leading-tight">{job.job_title}</h4>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Building size={12} className="mr-1" />
              <span>{job.employer}</span>
              {job.employer_verified && <CheckCircle2 size={12} className="text-blue-500 ml-1" />}
            </div>
          </div>
          {job.match_percentage && (
            <div className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-semibold flex flex-col items-center border border-green-100 shadow-sm">
              <span>{job.match_percentage}%</span>
              <span className="text-[9px] font-medium opacity-80 uppercase tracking-wider leading-none">Match</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3">
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <MapPin size={12} className="mr-1 text-gray-400" />
            <span className="truncate max-w-[120px]">{job.location}</span>
          </div>
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <Briefcase size={12} className="mr-1 text-gray-400" />
            <span>{job.employment_type}</span>
          </div>
          {job.salary && job.salary !== 'Not disclosed by the employer' && (
            <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md border border-gray-100 text-green-600 font-medium">
              <DollarSign size={12} className="mr-1" />
              <span>{job.salary}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-2">
          <button 
            type="button"
            className="text-xs font-medium text-blue-600 flex items-center hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <><ChevronUp size={14} className="mr-1" /> Hide Details</>
            ) : (
              <><ChevronDown size={14} className="mr-1" /> View Match Details</>
            )}
          </button>
          
          {job.post_id && (
            <Link 
              to={`/jobs/${job.post_id}`} 
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Apply Now
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50/50 overflow-hidden"
          >
            <div className="p-4">
              {job.match_factors ? (
                <MatchScoreCard matchFactors={job.match_factors} score={job.match_percentage} />
              ) : (
                <div className="text-xs text-gray-600 space-y-2">
                  <p><span className="font-medium text-gray-800">Experience:</span> {job.experience_level}</p>
                  <p><span className="font-medium text-gray-800">Education:</span> {job.minimum_education}</p>
                  <p><span className="font-medium text-gray-800">Skills:</span> {job.required_skills?.join(', ') || 'Not specified'}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
