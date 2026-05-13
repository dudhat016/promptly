import React, { useState } from 'react';
import { editImage, generateFromScratch } from '../services/gemini';
import { LoadingState } from '../types';

const ImageEditor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [mode, setMode] = useState<'edit' | 'create'>('edit');

  const handleAction = async () => {
    setLoading(LoadingState.LOADING);
    try {
      let res: string;
      if (mode === 'edit') {
          if (!file) {
              alert('Please upload an image to edit');
              setLoading(LoadingState.IDLE);
              return;
          }
          res = await editImage(file, prompt);
      } else {
          if (!prompt) {
              alert('Please enter a prompt to generate an image');
              setLoading(LoadingState.IDLE);
              return;
          }
          res = await generateFromScratch(prompt);
      }
      setResult(res);
      setLoading(LoadingState.SUCCESS);
    } catch (error) {
      console.error(error);
      setLoading(LoadingState.ERROR);
      alert('Operation failed.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 glass-panel rounded-2xl shadow-xl">
      <div className="flex gap-4 mb-6 justify-center">
        <button 
            onClick={() => { setMode('edit'); setResult(null); }}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${mode === 'edit' ? 'bg-rose-500 text-white' : 'bg-white text-rose-500'}`}
        >
            Edit Image (Flash)
        </button>
        <button 
            onClick={() => { setMode('create'); setResult(null); }}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${mode === 'create' ? 'bg-rose-500 text-white' : 'bg-white text-rose-500'}`}
        >
            Create New (Imagen)
        </button>
      </div>

      <div className="space-y-6">
        {mode === 'edit' && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 relative h-64 flex items-center justify-center">
            <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
                <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="max-h-full rounded-lg shadow-sm"
                />
            ) : (
                <p className="text-gray-500">Upload an image to edit</p>
            )}
            </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'edit' ? "Describe how to change the image (e.g. 'Add a retro filter', 'Make the background snowy')" : "Describe the image you want to create..."}
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          rows={3}
        />

        <button
          onClick={handleAction}
          disabled={loading === LoadingState.LOADING}
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
        >
          {loading === LoadingState.LOADING ? 'Processing...' : (mode === 'edit' ? 'Edit Image' : 'Generate Image')}
        </button>

        {result && (
          <div className="mt-8 p-4 bg-white rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-2 text-gray-800">Result</h3>
            <img src={result} alt="Result" className="w-full rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;
