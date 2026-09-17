import React from 'react';

const DoleCertificationCheckbox = ({ isChecked, onChange }) => {
  return (
    <div className="mt-8 mb-6 p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
      <label className="flex items-start gap-4 cursor-pointer group">
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            required
            checked={isChecked}
            onChange={onChange}
            className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer"
          />
        </div>
        <div className="flex-col">
          <span className="block text-sm font-semibold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
            CERTIFICATION / AUTHORIZATION
          </span>
          <span className="block text-sm text-slate-600 leading-relaxed">
            This is to certify that all data/information that I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.
          </span>
        </div>
      </label>
    </div>
  );
};

export default DoleCertificationCheckbox;
