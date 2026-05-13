import React, { useState } from 'react';
import { GenerationOptions } from '../types';
import { CHARACTERS, STYLES, SETTINGS, VIBES } from '../constants';
import { generateImage } from '../services/geminiService';
import SelectControl from './SelectControl';
import Button from './Button';
import Spinner from './Spinner';
import { SparklesIcon } from '@heroicons/react/24/outline';

const Generator: React.FC = () => {
  const [options, setOptions] = useState<GenerationOptions>({
    character: 'ice_queen',
    style: 'photorealistic',
    setting: 'luxury_ski_lodge',
    vibe: 'nice',
    customPrompt: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleOptionChange = (field: keyof GenerationOptions, value: string) => {
    setOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImage(options);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-black/30 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SelectControl
              label="Character"
              value={options.character}
              options={CHARACTERS}
              onChange={value => handleOptionChange('character', value)}
            />
            <SelectControl
              label="Vibe"
              value={options.vibe}
              options={VIBES}
              onChange={value => handleOptionChange('vibe', value)}
            />
            <SelectControl
              label="Art Style"
              value={options.style}
              options={STYLES}
              onChange={value => handleOptionChange('style', value)}
            />
            <SelectControl
              label="Setting"
              value={options.setting}
              options={SETTINGS}
              onChange={value => handleOptionChange('setting', value)}
            />
          </div>
          <div>
            <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-300 mb-1">
              Add Your Own Twist (Optional)
            </label>
            <textarea
              id="customPrompt"
              rows={3}
              value={options.customPrompt}
              onChange={e => handleOptionChange('customPrompt', e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., ...wearing a diamond choker, with emerald green eyes"
            />
          </div>
          <div className="text-center">
            <Button type="submit" disabled={loading}>
              <SparklesIcon className="w-5 h-5 mr-2" />
              {loading ? 'Generating...' : 'Generate My Photo'}
            </Button>
          </div>
        </form>
      </div>

      {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mt-4 text-sm text-center">{error}</p>}

      <div className="mt-8">
        <div className="aspect-square max-w-2xl mx-auto bg-black/20 rounded-lg flex items-center justify-center p-4">
          {loading ? (
            <Spinner />
          ) : generatedImage ? (
            <img src={generatedImage} alt="Generated holiday" className="max-w-full max-h-full object-contain rounded-lg" />
          ) : (
            <p className="text-gray-500 text-center">Your AI-generated holiday masterpiece will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generator;