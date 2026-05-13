import React, { useState } from 'react';

interface AdvancedSettingsProps {
    hairstyle: string;
    setHairstyle: (s: string) => void;
    nails: string;
    setNails: (s: string) => void;
    outfit: string;
    setOutfit: (s: string) => void;
    skinComplexion: string;
    setSkinComplexion: (s: string) => void;
}

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const SettingButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`w-full p-2 rounded-lg border text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500
      ${isActive
        ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
      }`}
  >
    {children}
  </button>
);

interface OptionGroupProps {
    label: string;
    options: readonly string[];
    selected: string;
    onSelect: (option: string) => void;
}

const OptionGroup: React.FC<OptionGroupProps> = ({ label, options, selected, onSelect }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {options.map(opt => (
                <SettingButton
                    key={opt}
                    onClick={() => onSelect(opt)}
                    isActive={selected === opt}
                >
                    {opt}
                </SettingButton>
            ))}
        </div>
    </div>
);


const COMPLEXION_OPTIONS = ['Default', 'Glowing', 'Matte', 'Dewy', 'Satin'] as const;
const HAIRSTYLE_OPTIONS = ['Default', 'Ponytail', 'Waves', 'Bob', 'Bun', 'Braids'] as const;
const NAIL_OPTIONS = ['Default', 'French', 'Nude', 'Red', 'Chrome', 'Black'] as const;
const OUTFIT_OPTIONS = ['Default', 'Gown', 'Blouse', 'Leather', 'Casual', 'Cocktail'] as const;


export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
    hairstyle, setHairstyle,
    nails, setNails,
    outfit, setOutfit,
    skinComplexion, setSkinComplexion,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-200 hover:bg-gray-800/50"
                aria-expanded={isOpen}
            >
                <span>Advanced Customization</span>
                <ChevronDownIcon className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-4 border-t border-gray-800 space-y-4">
                     <OptionGroup 
                        label="Skin Complexion"
                        options={COMPLEXION_OPTIONS}
                        selected={skinComplexion}
                        onSelect={setSkinComplexion}
                     />
                     <OptionGroup 
                        label="Hairstyle"
                        options={HAIRSTYLE_OPTIONS}
                        selected={hairstyle}
                        onSelect={setHairstyle}
                     />
                     <OptionGroup 
                        label="Nails"
                        options={NAIL_OPTIONS}
                        selected={nails}
                        onSelect={setNails}
                     />
                     <OptionGroup 
                        label="Outfit"
                        options={OUTFIT_OPTIONS}
                        selected={outfit}
                        onSelect={setOutfit}
                     />
                </div>
            </div>
        </div>
    );
};
