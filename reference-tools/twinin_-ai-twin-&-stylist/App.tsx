import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { OptionsPanel } from './components/OptionsPanel';
import { ResultDisplay } from './components/ResultDisplay';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LoadingSpinner } from './components/LoadingSpinner';
import { OutfitCarousel } from './components/OutfitCarousel';
import { TwininOptions, GeminiResponse, AppMode, GeneratedTwin } from './types';
import { fileToGenerativePart } from './services/geminiService';
import { INITIAL_OPTIONS } from './constants';

const App: React.FC = () => {
  const [options, setOptions] = useState<TwininOptions>(INITIAL_OPTIONS);
  const [mode, setMode] = useState<AppMode>('create_twin');
  const [referencePhoto, setReferencePhoto] = useState<File | null>(null);
  const [twinPhoto, setTwinPhoto] = useState<File | null>(null);
  const [outfitPhoto, setOutfitPhoto] = useState<File | null>(null);
  const [selectedPresetOutfit, setSelectedPresetOutfit] = useState<string | null>(null);


  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedTwin[] | null>(null);

  const handleGenerate = useCallback(async () => {
    if (mode === 'create_twin' && !referencePhoto) {
      setError('Please upload a reference photo to create a twin.');
      return;
    }
    if (mode === 'outfit_switch' && !twinPhoto) {
      setError('Please upload an AI twin photo to switch outfits.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      if (mode === 'create_twin') {
        const generationConfigs = [
            { complexion: 'Cool Ivory', hair_style: 'Slicked-back wet look', image_ratio: '3:4 vertical' as const, scene_type: 'studio' },
            { complexion: 'Golden Honey', hair_style: 'Boho braids with flowers', image_ratio: '9:16 vertical' as const, scene_type: 'beach' },
            { complexion: 'Warm Almond', hair_style: 'Voluminous 90s supermodel blowout', image_ratio: '1:1 square' as const, scene_type: 'indoor_luxury' },
            { complexion: 'Sunkissed Bronze', hair_style: 'Jumbo twists high ponytail', image_ratio: '4:3' as const, scene_type: 'outdoor_city' },
            { complexion: 'Rich Espresso', hair_style: 'Asymmetrical pixie cut', image_ratio: '16:9' as const, scene_type: 'snow_cabin' },
        ];
        
        const generationPromises = generationConfigs.map(async (config) => {
            const currentOptions = { 
                ...options, 
                complexion: config.complexion,
                hair_style: config.hair_style,
                image_ratio: config.image_ratio,
                scene_type: config.scene_type,
            };
            
            const systemInstruction = `You are Twinin — an AI twin & outfit-switching stylist. Your *absolute top priority* is to create a photorealistic identical twin of the person in the reference photo, meticulously matching their unique facial features with extreme precision. The face must be an exact likeness. This includes face shape, nose, lips, jawline, eye shape, and brow shape. Do not alter these core features. The final image must be indistinguishable from a real photograph of the same person. While you must honor the user's selected ethnicity, the desired aesthetic is a luxury 'boss babe' look with a complexion precisely matching the user's 'complexion' choice. Your task is to generate a JSON object containing a detailed image generation prompt. The output must be a single JSON object with keys: "final_prompt", "short_caption", "scene_notes", "safety_notes".`;
            
            const promptParts = [
              await fileToGenerativePart(referencePhoto!),
              { text: `Generate the JSON based on these options for an identical twin: ${JSON.stringify(currentOptions)}` },
            ];
    
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: [{ role: 'user', parts: promptParts }],
              config: {
                  systemInstruction,
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 32768 },
                   responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      final_prompt: { type: Type.STRING },
                      short_caption: { type: Type.STRING },
                      scene_notes: { type: Type.STRING },
                      safety_notes: { type: Type.STRING },
                    }
                  }
              }
            });
    
            const geminiResponse: GeminiResponse = JSON.parse(response.text);
    
            const aspectRatioMap: { [key: string]: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' } = {
              "1:1 square": '1:1',
              "3:4 vertical": '3:4',
              "9:16 vertical": '9:16',
              "4:3": '4:3',
              "16:9": '16:9',
            };
    
            const imageResponse = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: geminiResponse.final_prompt,
              config: {
                numberOfImages: 1,
                aspectRatio: aspectRatioMap[currentOptions.image_ratio] || '1:1',
              },
            });
    
            const base64Image = imageResponse.generatedImages[0].image.imageBytes;
            return { 
                image: `data:image/png;base64,${base64Image}`, 
                details: geminiResponse,
                complexion: config.complexion,
                hairStyle: config.hair_style,
                aspectRatio: config.image_ratio,
            };
        });

        const generatedResults = await Promise.all(generationPromises);
        setResult(generatedResults);

      } else { // outfit_switch mode
        const outfitDescription = selectedPresetOutfit || options.outfit_style_notes;
        const promptParts = [
          { text: `Re-dress the person in this image. The new outfit should be: "${outfitDescription}". It is absolutely crucial that you keep the person's face, features, and body identical to the original image. Do not change their appearance at all, only the clothes.` },
           await fileToGenerativePart(twinPhoto!),
        ];
        
        if (outfitPhoto) {
            promptParts.push({ text: "Use the following uploaded image as an additional style reference for the new outfit:" });
            promptParts.push(await fileToGenerativePart(outfitPhoto));
        }

        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: promptParts },
          config: {
            responseModalities: ['IMAGE'],
          }
        });
        
        const part = imageResponse.candidates?.[0]?.content?.parts[0];
        if (part && 'inlineData' in part) {
            const base64Image = part.inlineData.data;
            setResult([{ 
                image: `data:image/png;base64,${base64Image}`, 
                details: null, 
                complexion: 'Switched Outfit',
                hairStyle: 'N/A',
                aspectRatio: 'N/A',
            }]);
        } else {
            throw new Error('Image generation failed for outfit switch.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(`An error occurred: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mode, options, referencePhoto, twinPhoto, outfitPhoto, selectedPresetOutfit]);

  return (
    <div className="min-h-screen bg-[#FDF5F9] text-[#111111] p-4 sm:p-6 lg:p-8">
      <Header />
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        {/* Left Column: Controls */}
        <div className="bg-white/60 rounded-2xl p-6 shadow-lg backdrop-blur-md border border-white/20">
          <h2 className="text-2xl font-bold text-[#D4007F]">1. Choose Your Mode</h2>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => { setMode('create_twin'); setSelectedPresetOutfit(null); }}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                mode === 'create_twin' ? 'bg-[#FF4FA3] text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Create AI Twin
            </button>
            <button
              onClick={() => setMode('outfit_switch')}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                mode === 'outfit_switch' ? 'bg-[#FF4FA3] text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Switch Outfit
            </button>
          </div>

          <hr className="my-6 border-pink-200" />
          
          <h2 className="text-2xl font-bold text-[#D4007F]">2. Upload Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {mode === 'create_twin' ? (
              <div className="md:col-span-2">
                <ImageUploader id="reference-photo" label="Your Reference Photo" onFileSelect={setReferencePhoto} />
              </div>
            ) : (
              <>
                <ImageUploader id="twin-photo" label="Your AI Twin Photo" onFileSelect={setTwinPhoto} />
                <ImageUploader id="outfit-photo" label="Upload an Outfit (Optional)" onFileSelect={setOutfitPhoto} />
              </>
            )}
          </div>
          
           {mode === 'outfit_switch' && (
              <>
                <hr className="my-6 border-pink-200" />
                <OutfitCarousel onSelect={setSelectedPresetOutfit} selectedOutfit={selectedPresetOutfit} />
              </>
            )}

          <hr className="my-6 border-pink-200" />

          <h2 className="text-2xl font-bold text-[#D4007F]">3. Customize Details</h2>
          <OptionsPanel options={options} setOptions={setOptions} isOutfitSwitchMode={mode === 'outfit_switch'} />

          <div className="mt-8">
             <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#D4007F] to-[#FF4FA3] text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isLoading ? <LoadingSpinner/> : '✨ Generate Now'}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="bg-white/60 rounded-2xl p-6 shadow-lg backdrop-blur-md border border-white/20 min-h-[60vh] flex flex-col justify-center items-center">
            {isLoading && (
              <div className="text-center">
                <LoadingSpinner large={true} />
                <p className="mt-4 text-lg font-semibold text-[#D4007F]">Your AI twin is getting ready...</p>
                <p className="text-pink-600">This can take a moment, sit tight!</p>
              </div>
            )}
            {error && <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>}
            {!isLoading && !error && result && <ResultDisplay result={result} />}
            {!isLoading && !error && !result && (
              <div className="text-center text-pink-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="mt-4 text-lg text-pink-700">Your generated image will appear here.</p>
                <p className="text-sm text-pink-500">Fill out the options and click "Generate Now" to start!</p>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;