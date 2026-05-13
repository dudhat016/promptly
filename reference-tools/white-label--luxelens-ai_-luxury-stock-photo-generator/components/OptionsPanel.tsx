import React, { useRef, useState, useEffect } from 'react';
import { ethnicities, complexions, makeupStyles, hairstyles, nailStyles, clothingStyles, settings, photographyStyles } from '../constants';
import { ChevronDownIcon, SparklesIcon, PhotoIcon, XCircleIcon, TrashIcon } from './icons';

interface OptionsPanelProps {
  selectedEthnicity: string;
  setSelectedEthnicity: (value: string) => void;
  complexion: string;
  setComplexion: (value: string) => void;
  makeupStyle: string;
  setMakeupStyle: (value: string) => void;
  hairstyle: string;
  setHairstyle: (value: string) => void;
  nailStyle: string;
  setNailStyle: (value: string) => void;
  clothingStyle: string;
  setClothingStyle: (value: string) => void;
  setting: string;
  setSetting: (value: string) => void;
  photographyStyle: string;
  setPhotographyStyle: (value: string) => void;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  isLoading: boolean;
  onGenerateClick: () => void;
  uploadedImage: string | null;
  setUploadedImage: (value: string | null) => void;
}

interface PresetSettings {
  selectedEthnicity: string;
  complexion: string;
  makeupStyle: string;
  hairstyle: string;
  nailStyle: string;
  clothingStyle: string;
  setting: string;
  photographyStyle: string;
  customPrompt: string;
}

interface Preset {
  name: string;
  settings: PresetSettings;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  selectedEthnicity,
  setSelectedEthnicity,
  complexion,
  setComplexion,
  makeupStyle,
  setMakeupStyle,
  hairstyle,
  setHairstyle,
  nailStyle,
  setNailStyle,
  clothingStyle,
  setClothingStyle,
  setting,
  setSetting,
  photographyStyle,
  setPhotographyStyle,
  customPrompt,
  setCustomPrompt,
  isLoading,
  onGenerateClick,
  uploadedImage,
  setUploadedImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState('');
  
  const PRESETS_STORAGE_KEY = 'luxeLensPresets';

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (error) {
      console.error("Failed to load presets from localStorage", error);
    }
  }, []);
  
  const savePresetsToStorage = (presetsToSave: Preset[]) => {
      try {
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presetsToSave));
      } catch (error) {
          console.error("Failed to save presets to localStorage", error);
      }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const currentSettings: PresetSettings = {
      selectedEthnicity,
      complexion,
      makeupStyle,
      hairstyle,
      nailStyle,
      clothingStyle,
      setting,
      photographyStyle,
      customPrompt,
    };

    const newPreset: Preset = { name: presetName.trim(), settings: currentSettings };
    
    const existingPresetIndex = presets.findIndex(p => p.name === newPreset.name);
    let updatedPresets;

    if (existingPresetIndex > -1) {
      updatedPresets = [...presets];
      updatedPresets[existingPresetIndex] = newPreset;
    } else {
      updatedPresets = [...presets, newPreset];
    }
    
    setPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    setSelectedPresetName(newPreset.name);
    setPresetName('');
  };

  const handlePresetSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedPresetName(name);

    if (name) {
      const preset = presets.find(p => p.name === name);
      if (preset) {
        setSelectedEthnicity(preset.settings.selectedEthnicity);
        setComplexion(preset.settings.complexion);
        setMakeupStyle(preset.settings.makeupStyle);
        setHairstyle(preset.settings.hairstyle);
        setNailStyle(preset.settings.nailStyle);
        setClothingStyle(preset.settings.clothingStyle);
        setSetting(preset.settings.setting);
        setPhotographyStyle(preset.settings.photographyStyle);
        setCustomPrompt(preset.settings.customPrompt);
      }
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPresetName) return;

    const updatedPresets = presets.filter(p => p.name !== selectedPresetName);
    setPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    setSelectedPresetName('');
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const base64 = loadEvent.target?.result as string;
            const base64Data = base64.split(',')[1];
            setUploadedImage(base64Data);
        };
        reader.readAsDataURL(file);
    }
    if(e.target) e.target.value = '';
  };

  const renderSelect = (id: string, label: string, value: string, onChange: (val: string) => void, options: string[]) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-pink-800">
        {label}
      </label>
      <div className="relative mt-1">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-3 pr-10 py-2 text-base border-pink-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md appearance-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDownIcon className="h-5 w-5 text-pink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );


  return (
    <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-lg lg:min-h-[calc(100vh-80px)]">
      <div className="space-y-6">
        <div>
           <label className="block text-sm font-medium text-pink-800">
            Optional: Upload Inspiration Image
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg"
            className="hidden"
          />
          {uploadedImage ? (
            <div className="mt-2 relative group w-full aspect-video rounded-lg overflow-hidden">
                <img src={`data:image/jpeg;base64,${uploadedImage}`} alt="Upload preview" className="w-full h-full object-cover" />
                <button 
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 bg-pink-900/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
            </div>
          ) : (
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 w-full flex justify-center items-center px-4 py-2 border-2 border-dashed border-pink-200 rounded-md text-sm font-medium text-pink-600 hover:border-pink-400 hover:text-pink-500 transition-colors"
            >
                <PhotoIcon className="w-5 h-5 mr-2" />
                Click to upload
            </button>
          )}
        </div>

        <div className="space-y-3 p-4 border border-pink-200 rounded-lg">
          <h3 className="text-sm font-bold text-pink-800">Style Presets</h3>
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <select
                value={selectedPresetName}
                onChange={handlePresetSelectionChange}
                className="w-full pl-3 pr-10 py-2 text-base border-pink-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md appearance-none"
                aria-label="Load a style preset"
              >
                <option value="">Load a preset...</option>
                {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <ChevronDownIcon className="h-5 w-5 text-pink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={handleDeletePreset}
              disabled={!selectedPresetName}
              className="p-2 text-pink-500 hover:text-pink-700 disabled:text-pink-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Delete selected preset"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="New preset name..."
              className="flex-grow p-2 text-base border-pink-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-pink-400 hover:bg-pink-500 disabled:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-4">
            <div className="pt-4 border-t border-pink-200">
                <h3 className="text-lg font-semibold text-pink-900 mb-2">Art Direction</h3>
                {renderSelect("photographyStyle", "1. Photography Style", photographyStyle, setPhotographyStyle, photographyStyles)}
                {renderSelect("setting", "2. Setting", setting, setSetting, settings)}
            </div>

            <div className="pt-4 border-t border-pink-200">
                 <h3 className="text-lg font-semibold text-pink-900 mb-2">Model Details</h3>
                {renderSelect("ethnicity", "3. Ethnicity", selectedEthnicity, setSelectedEthnicity, ethnicities)}
                {renderSelect("complexion", "4. Complexion", complexion, setComplexion, complexions)}
                {renderSelect("makeup", "5. Makeup Style", makeupStyle, setMakeupStyle, makeupStyles)}
                {renderSelect("hairstyle", "6. Hairstyle", hairstyle, setHairstyle, hairstyles)}
                {renderSelect("nails", "7. Nail Style", nailStyle, setNailStyle, nailStyles)}
                {renderSelect("clothing", "8. Clothing Style", clothingStyle, setClothingStyle, clothingStyles)}
            </div>
        
            <div className="pt-4 border-t border-pink-200">
                <label htmlFor="customPrompt" className="block text-lg font-semibold text-pink-900 mb-2">
                    9. Additional Details
                </label>
                <textarea
                id="customPrompt"
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-2 text-base border-pink-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                placeholder="e.g., wearing diamond earrings, holding a glass..."
                />
            </div>
        </div>

      </div>

      <div className="mt-8 sticky bottom-0 bg-white py-4">
        <button
          onClick={onGenerateClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-200 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
             <> <SparklesIcon className="w-5 h-5 mr-2" /> Generate Image </>
          )}
        </button>
      </div>
    </div>
  );
};