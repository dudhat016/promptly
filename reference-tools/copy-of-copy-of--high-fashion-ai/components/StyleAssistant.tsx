
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SparklesIcon, PhotoIcon } from './icons';

const StyleAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageGenPrompt, setImageGenPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [promptExamples] = useState([
    "A confident businesswoman in a sharp power suit, standing in a modern, sunlit skyscraper office overlooking a city skyline.",
    "Close-up of a luxurious diamond necklace on a mannequin with dramatic, cinematic lighting.",
    "A chic woman in a flowing white dress and wide-brimmed hat, walking on a pristine tropical beach.",
    "Flat lay of luxury beauty products (perfume, lipstick, serum) on a marble surface with silk fabric and a single rose.",
    "A handsome man in a tailored tuxedo adjusting his bow tie, looking into a mirror in a dimly lit, opulent room."
  ]);
  
  const handleGenerateImage = async () => {
    if (!imageGenPrompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const finalPrompt = `(professional stock photo, luxurious, scroll-stopping, high fashion, 8k, sharp focus), ${imageGenPrompt}`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '9:16',
            },
        });
        
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        setGeneratedImage(imageUrl);

    } catch (e: any) {
        setError(e.message || "An error occurred while generating the image.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
      <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">
            Luxury Image Generator
          </h2>
          <p className="text-gray-400">Create scroll-stopping, high-end stock photos with AI.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <textarea
              value={imageGenPrompt}
              onChange={(e) => setImageGenPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-shadow"
          />
          <button
              onClick={handleGenerateImage}
              disabled={loading || !imageGenPrompt}
              className="w-full flex justify-center items-center gap-2 bg-gray-200 text-black font-bold py-3 px-4 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
              {loading ? 'Generating...' : 'Create Image'}
              <SparklesIcon className="w-5 h-5"/>
          </button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Need inspiration? Try one of these:</h3>
              <div className="flex flex-col gap-2">
                  {promptExamples.map((prompt, index) => (
                      <button 
                        key={index} 
                        onClick={() => setImageGenPrompt(prompt)}
                        className="text-left text-xs text-gray-400 bg-gray-800/50 p-2 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        {prompt}
                      </button>
                  ))}
              </div>
          </div>
        </div>

        {/* Image Display */}
        <div className="aspect-[9/16] bg-gray-800 rounded-lg flex justify-center items-center overflow-hidden">
            {loading ? (
                <div className="text-center text-gray-400">
                    <SparklesIcon className="w-16 h-16 animate-pulse mx-auto mb-4"/>
                    <p>Creating your vision...</p>
                </div>
            ) : generatedImage ? (
                <img src={generatedImage} alt="Generated fashion" className="w-full h-full object-cover" />
            ) : (
                <div className="text-center text-gray-500 p-8">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-4"/>
                    <p>Your generated image will appear here.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StyleAssistant;
