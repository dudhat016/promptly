import React from 'react';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  onRatioChange: (ratio: string) => void;
}

const RATIO_OPTIONS = [
  { label: 'Square', value: '1:1' },
  { label: 'Portrait', value: '4:5' },
  { label: 'Classic', value: '2:3' },
  { label: 'Widescreen', value: '16:9' },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onRatioChange }) => {
  return (
    <div>
      <p className="text-gray-400 mb-3">Select the orientation for your final image.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {RATIO_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onRatioChange(option.value)}
            className={`w-full p-3 rounded-lg border text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
              ${selectedRatio === option.value
                ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg'
                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
              }`}
          >
            <div className="font-bold text-base">{option.label}</div>
            <div className="text-xs font-mono opacity-80">{option.value}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
