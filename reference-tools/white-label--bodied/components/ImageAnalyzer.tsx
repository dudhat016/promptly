
import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import Spinner from './Spinner';

const ImageAnalyzer: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Describe the style and suggest improvements.');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysis(null);
      setError(null);
    }
  };
  
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeImage(imageFile, prompt);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Upload Your Look</h2>
          <div 
            className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900 relative cursor-pointer hover:border-pink-500 transition-colors"
            onClick={handleUploadButtonClick}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
            ) : (
               <div className="text-center text-gray-400 p-4">
                    <p className="font-semibold">Drag & drop your image here</p>
                    <p className="text-sm text-gray-500">or click to upload</p>
                </div>
            )}
             <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>
           <button
            onClick={handleUploadButtonClick}
            disabled={isLoading}
            className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            {imageFile ? 'Change Image' : 'Upload Image'}
          </button>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Analysis Prompt</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-24 bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
            disabled={isLoading}
          />
        </div>
         <button
          onClick={handleAnalyze}
          disabled={isLoading || !imageFile}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Style'}
        </button>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">AI Feedback</h2>
        <div className="flex-grow w-full bg-gray-900 text-gray-300 p-4 rounded-md overflow-y-auto">
          {isLoading && <Spinner />}
          {error && <p className="text-red-400">{error}</p>}
          {analysis ? (
             <p className="whitespace-pre-wrap">{analysis}</p>
          ) : (
            !isLoading && <p className="text-gray-500">Your style analysis will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;
