import React from 'react';
import { motion } from 'framer-motion';
import { Search, Map, Calendar, Briefcase } from 'lucide-react';

export default function ActionButtons({ onActionSelected, context = 'default' }) {
  const actions = {
    default: [
      { id: 'jobs', label: 'Find Jobs', icon: Search, text: 'I am looking for jobs in Urdaneta' },
      { id: 'fairs', label: 'Job Fairs', icon: Calendar, text: 'Are there any upcoming job fairs?' },
      { id: 'charter', label: 'Services', icon: Briefcase, text: 'What services does PESO offer?' },
    ],
    jobs: [
      { id: 'map', label: 'View on Map', icon: Map, text: 'Show these jobs on a map' },
      { id: 'filter', label: 'Filter by Location', icon: Search, text: 'Filter these jobs by location' },
    ]
  };

  const currentActions = actions[context] || actions.default;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {currentActions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onActionSelected(action.text)}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm"
          >
            <Icon size={12} />
            {action.label}
          </motion.button>
        );
      })}
    </div>
  );
}
