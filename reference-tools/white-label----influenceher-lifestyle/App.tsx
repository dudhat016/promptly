import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import OptionSelector from './components/OptionSelector';
import ImageGallery from './components/ImageGallery';
import Loader from './components/Loader';
import { generateLifestyleImages } from './services/geminiService';
import { GenerationOptions, GeneratedImage } from './types';
import { OUTFIT_STYLES, LOCATIONS, HAIRSTYLES, SKIN_STYLES, SCENE_PRESETS, HEIGHT_OPTIONS, BUST_SIZES, WAIST_SIZES, HIPS_SIZES, ASPECT_RATIOS } from './constants';

const App: React.FC = () => {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    outfit: OUTFIT_STYLES[0],
    location: LOCATIONS[0],
    hairstyle: HAIRSTYLES[0],
    skin: SKIN_STYLES[0],
    numberOfImages: 8,
    enhancer: '',
    scenePreset: SCENE_PRESETS[0].name,
    height: HEIGHT_OPTIONS[0],
    bust: BUST_SIZES[0],
    waist: WAIST_SIZES[0],
    hips: HIPS_SIZES[0],
    aspectRatio: ASPECT_RATIOS[0],
  });
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    setReferenceFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleOptionChange = (key: keyof GenerationOptions, value: string | number) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateClick = useCallback(async () => {
    if (!referenceFile) {
      setError("Please upload a reference image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateLifestyleImages(referenceFile, options);
      setGeneratedImages(images);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [referenceFile, options]);
    
  // --- ICONS ---
  const ScenePresetIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM5 15a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" /></svg>);
  const OutfitIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 9a1 1 0 01-1-1V6a1 1 0 112 0v2a1 1 0 01-1 1zm13-1a1 1 0 100-2v-2a1 1 0 10-2 0v2a1 1 0 001 1zM7 12a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" /><path fillRule="evenodd" d="M10 4a6 6 0 100 12 6 6 0 000-12zM3 10a7 7 0 1114 0 7 7 0 01-14 0z" clipRule="evenodd" /></svg>);
  const LocationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
  const HairstyleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>);
  const SkinIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6 7a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 000 2h3a1 1 0 100-2H7z" clipRule="evenodd" /></svg>);
  const NumberIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>);
  const EnhancerIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
  const BodyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
  const AspectRatioIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-deep-pink" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 2v10h10V5H5z" clipRule="evenodd" /></svg>);

  return (
    <div className="min-h-screen bg-brand-blush font-sans text-brand-text">
      {isLoading && <Loader />}
      <div className="container mx-auto px-4 py-8">
        <Header />
        
        <main className="mt-10 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-6">1. Upload Your Photo</h2>
            <ImageUploader onImageUpload={handleImageUpload} imagePreview={imagePreview} />

            <div className="mt-10">
              <h2 className="text-2xl font-bold text-center mb-6">2. Customize Your Scenes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
                <OptionSelector label="Scene Preset" value={options.scenePreset} options={SCENE_PRESETS.map(p => p.name)} onChange={(v) => handleOptionChange('scenePreset', v)} icon={<ScenePresetIcon/>} />
                <OptionSelector label="Location Vibe" value={options.location} options={LOCATIONS} onChange={(v) => handleOptionChange('location', v)} icon={<LocationIcon/>} />
                <OptionSelector label="Outfit Style" value={options.outfit} options={OUTFIT_STYLES} onChange={(v) => handleOptionChange('outfit', v)} icon={<OutfitIcon/>} />
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold text-center mb-6">3. Refine Your Twin's Appearance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
                 <OptionSelector label="Hairstyle" value={options.hairstyle} options={HAIRSTYLES} onChange={(v) => handleOptionChange('hairstyle', v)} icon={<HairstyleIcon/>} />
                 <OptionSelector label="Skin Style" value={options.skin} options={SKIN_STYLES} onChange={(v) => handleOptionChange('skin', v)} icon={<SkinIcon/>} />
                 <OptionSelector label="Aspect Ratio" value={options.aspectRatio} options={ASPECT_RATIOS} onChange={(v) => handleOptionChange('aspectRatio', v)} icon={<AspectRatioIcon/>} />
                 <OptionSelector label="Height" value={options.height} options={HEIGHT_OPTIONS} onChange={(v) => handleOptionChange('height', v)} icon={<BodyIcon/>} />
                 <OptionSelector label="Bust" value={options.bust} options={BUST_SIZES} onChange={(v) => handleOptionChange('bust', v)} icon={<BodyIcon/>} />
                 <OptionSelector label="Waist" value={options.waist} options={WAIST_SIZES} onChange={(v) => handleOptionChange('waist', v)} icon={<BodyIcon/>} />
                 <OptionSelector label="Hips" value={options.hips} options={HIPS_SIZES} onChange={(v) => handleOptionChange('hips', v)} icon={<BodyIcon/>} />
              </div>
            </div>

            <div className="mt-10">
                <h2 className="text-2xl font-bold text-center mb-6">4. Final Touches</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 items-center">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2 flex items-center gap-2">
                            <EnhancerIcon />
                            Optional: Enhance Your Scene
                        </label>
                        <textarea
                            value={options.enhancer}
                            onChange={(e) => handleOptionChange('enhancer', e.target.value)}
                            placeholder="e.g., 'holding a pumpkin spice latte'"
                            className="w-full p-2.5 text-base border-2 border-brand-pink rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-deep-pink focus:border-brand-deep-pink bg-white transition-colors"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2 flex items-center gap-2">
                            <NumberIcon />
                            Number of Images: <span className="font-bold text-brand-deep-pink">{options.numberOfImages}</span>
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            value={options.numberOfImages}
                            onChange={(e) => handleOptionChange('numberOfImages', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-brand-blush rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>
                </div>
            </div>

             <div className="mt-10 text-center">
              <button
                onClick={handleGenerateClick}
                disabled={!referenceFile || isLoading}
                className="inline-flex items-center justify-center px-12 py-4 border border-transparent text-lg font-semibold rounded-full shadow-lg text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-transform duration-300"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                Generate My Lifestyle
              </button>
            </div>

             {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          </div>

          <ImageGallery images={generatedImages} />

        </main>
      </div>
    </div>
  );
};

export default App;
