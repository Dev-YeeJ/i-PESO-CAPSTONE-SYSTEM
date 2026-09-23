import React from 'react';
import { motion } from 'framer-motion';

export default function MatchScoreCard({ matchFactors, score }) {
  if (!matchFactors) return null;

  const factors = [
    { label: 'Skills', value: matchFactors.skills || 0, max: 40 },
    { label: 'Occupation', value: matchFactors.occupation || 0, max: 30 },
    { label: 'Experience', value: matchFactors.experience || 0, max: 20 },
    { label: 'Education', value: matchFactors.education || 0, max: 10 },
  ];

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
      <div className="mb-3 flex justify-between items-end">
        <div>
          <h5 className="text-xs font-semibold text-gray-800">Why did this job match?</h5>
          <p className="text-[10px] text-gray-500 mt-0.5">Based on your i-PESO profile</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-blue-600 leading-none">{score}%</span>
          <span className="text-[10px] text-gray-500 block uppercase tracking-wide">Overall</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {factors.map((factor, idx) => {
          const percentage = factor.max > 0 ? (factor.value / factor.max) * 100 : 0;
          return (
            <div key={factor.label}>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="font-medium text-gray-700">{factor.label}</span>
                <span className="text-gray-500 font-medium">{factor.value}/{factor.max} pts</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.2 + (idx * 0.1), duration: 0.5, ease: "easeOut" }}
                  className={`h-1.5 rounded-full ${
                    percentage >= 80 ? 'bg-green-500' : 
                    percentage >= 50 ? 'bg-yellow-400' : 
                    'bg-red-400'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
