import React from 'react';

interface GenerationSettingsProps {
  numberOfImages: number;
  onNumberOfImagesChange: (n: number) => void;
  aspectRatio: string;
  onRatioChange: (ratio: string) => void;
  matchOriginalFace: boolean;
  onMatchOriginalFaceChange: (value: boolean) => void;
  matchSkinTone: boolean;
  onMatchSkinToneChange: (value: boolean) => void;
}

const NUMBER_OPTIONS = [1, 2, 4, 8];
const RATIO_OPTIONS = [
  { label: 'Portrait', value: '9:16' },
  { label: 'Social', value: '4:5' },
  { label: 'Classic', value: '2:3' },
  { label: 'Square', value: '1:1' },
  { label: 'Landscape', value: '16:9' },
];

const SettingButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`w-full p-2 rounded-lg border text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500
      ${isActive
        ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
      }`}
  >
    {children}
  </button>
);


export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  numberOfImages,
  onNumberOfImagesChange,
  aspectRatio,
  onRatioChange,
  matchOriginalFace,
  onMatchOriginalFaceChange,
  matchSkinTone,
  onMatchSkinToneChange,
}) => {
  return (
    <div>
        <h2 className="text-xl font-bold mb-4 text-gray-200">3. Adjust Settings</h2>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Images</label>
                <div className="grid grid-cols-4 gap-2">
                    {NUMBER_OPTIONS.map(num => (
                        <SettingButton key={num} onClick={() => onNumberOfImagesChange(num)} isActive={numberOfImages === num}>
                            {num}
                        </SettingButton>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Canvas Shape</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {RATIO_OPTIONS.map(opt => (
                        <SettingButton key={opt.value} onClick={() => onRatioChange(opt.value)} isActive={aspectRatio === opt.value}>
                            <div>{opt.label}</div>
                            <div className="text-xs opacity-75 font-mono">{opt.value}</div>
                        </SettingButton>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Identity Fidelity</label>
                <button
                    onClick={() => onMatchOriginalFaceChange(!matchOriginalFace)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                    aria-pressed={matchOriginalFace}
                >
                    <div className="text-left">
                        <span className="font-semibold">Match Original Face</span>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs">
                            {matchOriginalFace 
                                ? 'Ensures the generated face is an identical twin to the reference.' 
                                : 'Allows for minor artistic interpretation of features.'}
                        </p>
                    </div>
                    <div className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-300 ${matchOriginalFace ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <span className={`absolute top-1/2 -translate-y-1/2 left-1 block w-4 h-4 rounded-full bg-white transition-transform duration-300 ${matchOriginalFace ? 'transform translate-x-5' : ''}`}></span>
                    </div>
                </button>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Skin Tone Fidelity</label>
                <button
                    onClick={() => onMatchSkinToneChange(!matchSkinTone)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                    aria-pressed={matchSkinTone}
                >
                    <div className="text-left">
                        <span className="font-semibold">Match Original Skin Tone</span>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs">
                            {matchSkinTone 
                                ? 'Precisely matches the skin tone from the source photos.' 
                                : 'Allows artistic adjustments to skin tone for lighting.'}
                        </p>
                    </div>
                    <div className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-300 ${matchSkinTone ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <span className={`absolute top-1/2 -translate-y-1/2 left-1 block w-4 h-4 rounded-full bg-white transition-transform duration-300 ${matchSkinTone ? 'transform translate-x-5' : ''}`}></span>
                    </div>
                </button>
            </div>
        </div>
    </div>
  );
};