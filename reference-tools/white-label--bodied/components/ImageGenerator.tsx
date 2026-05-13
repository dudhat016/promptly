
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import Spinner from './Spinner';
import { 
    hairPresets, 
    hairstylePresets, 
    complexionPresets, 
    outfitPresets, 
    makeupPresets, 
    posePresets, 
    lightingPresets,
    bodyShapePresets,
    ethnicityPresets
} from './presets';

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const stylePresets = [
  {
    name: 'Glam Baddie',
    prompt: 'A stunning curvy model in a full-glam look. She wears a glittering evening gown, diamond jewelry, and has flawless makeup with a bold lip. The setting is a luxurious penthouse overlooking the city at night.',
  },
  {
    name: 'Streetwear Baddie',
    prompt: 'A confident, stylish woman with an hourglass figure posing on a vibrant city street. She is wearing high-fashion streetwear, including baggy cargo pants, a cropped hoodie, and limited-edition sneakers. Her attitude is cool and effortless.',
  },
  {
    name: 'Bodycon Baddie',
    prompt: 'An empowered woman with striking curves wearing a sleek, vibrant-colored bodycon dress. She is in a minimalist, modern studio with dramatic lighting that highlights her powerful silhouette. Her pose is strong and self-assured.',
  },
   {
    name: 'Festival Baddie',
    prompt: 'A radiant, curvy woman at a golden-hour music festival. She is wearing a trendy, bohemian-chic outfit with edgy accessories. Her hair and makeup are creative and expressive, capturing the free-spirited festival vibe.',
  },
  {
    name: 'Athleisure Baddie',
    prompt: 'A strong, fit woman with a powerful build in a high-end athleisure set. She is posing in a modern, sunlit gym or an urban park, looking both relaxed and incredibly stylish. The look is sporty, luxurious, and confident.',
  }
];

interface PresetDropdownProps {
  label: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled: boolean;
}

const PresetDropdown: React.FC<PresetDropdownProps> = ({ label, options, onSelect, disabled }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
    <select
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
          e.target.selectedIndex = 0;
        }
      }}
      disabled={disabled}
      className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
    >
      <option value="">Select {label}...</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
    </select>
  </div>
);


const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetClick = (preset: { name: string; prompt: string }) => {
    setPrompt(preset.prompt);
    setActivePreset(preset.name);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    setActivePreset(null); 
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateImage(prompt, aspectRatio);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppendToPrompt = (value: string) => {
    const cleanedValue = value.replace(/_/g, ' ');
    setPrompt(prev => prev ? `${prev}, ${cleanedValue}` : cleanedValue);
  }

  return (
    <div className="space-y-6">
       <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Style Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {stylePresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              disabled={isLoading}
              className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 border-2 text-sm ${
                activePreset === preset.name
                  ? 'bg-pink-600 border-pink-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-pink-500'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl space-y-6">
        <h2 className="text-xl font-bold text-white">Prompt Builder</h2>
        
        {/* -- Model Appearance -- */}
        <div>
          <h3 className="text-lg font-semibold text-pink-400 mb-3 border-b border-gray-700 pb-2">Model Appearance</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <PresetDropdown label="Ethnicity" options={ethnicityPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Body Shape" options={bodyShapePresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Complexion" options={complexionPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Hair" options={hairPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Hairstyle" options={hairstylePresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Makeup" options={makeupPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
          </div>
        </div>

        {/* -- Style & Scene -- */}
         <div>
          <h3 className="text-lg font-semibold text-pink-400 mb-3 border-b border-gray-700 pb-2">Style & Scene</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <PresetDropdown label="Outfit" options={outfitPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Pose" options={posePresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
            <PresetDropdown label="Lighting" options={lightingPresets} onSelect={handleAppendToPrompt} disabled={isLoading} />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Your Final Prompt</h2>
          <button onClick={() => setPrompt('')} className="text-sm text-gray-400 hover:text-white">Clear</button>
        </div>
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Build your prompt with the menus above or type here..."
          className="w-full h-24 bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
          disabled={isLoading}
        />
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Aspect Ratio</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              disabled={isLoading}
              className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 border-2 ${
                aspectRatio === ratio
                  ? 'bg-pink-600 border-pink-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-pink-500'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full md:w-auto bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>
      </div>

      {error && <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}

      <div className="bg-gray-800 p-4 rounded-lg shadow-xl min-h-[300px] flex items-center justify-center">
        {isLoading ? (
          <Spinner />
        ) : generatedImage ? (
          <img src={generatedImage} alt="Generated" className="max-w-full max-h-[70vh] rounded-lg shadow-lg" />
        ) : (
          <div className="text-center text-gray-500">
            <p>Your generated image will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
