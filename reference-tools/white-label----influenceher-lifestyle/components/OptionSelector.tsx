import React from 'react';

interface OptionSelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  // Fix: Use React.ReactElement instead of JSX.Element to resolve 'Cannot find namespace JSX' error.
  icon: React.ReactElement;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({ label, value, options, onChange, icon }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-brand-text mb-1 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-3 pr-10 py-2.5 text-base border-2 border-brand-pink rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-deep-pink focus:border-brand-deep-pink appearance-none bg-white cursor-pointer"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-deep-pink">
           <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default OptionSelector;
