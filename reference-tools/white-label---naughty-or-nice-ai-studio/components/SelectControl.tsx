import React from 'react';

interface SelectControlProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const SelectControl: React.FC<SelectControlProps> = ({ label, value, options, onChange }) => {
  const formattedLabel = (option: string) => {
    return option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-red-500 focus:border-red-500"
      >
        {options.map(option => (
          <option key={option} value={option} className="bg-gray-800">
            {formattedLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectControl;