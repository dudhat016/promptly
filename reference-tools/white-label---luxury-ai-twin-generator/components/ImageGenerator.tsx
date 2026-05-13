import React, { useState, useCallback, DragEvent } from 'react';
import { Preset, Presets, HairStyle, HairStyles } from '../types';
import { analyzeReferenceImages, buildUltraLuxuryPrompt } from '../services/promptService';
import { generateImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

export const ImageGenerator: React.FC = () => {
  const [promptTitle, setPromptTitle] = useState<string>("A Day at the Beach");
  const [promptDescription, setPromptDescription] = useState<string>("A stunning portrait on a sun-drenched beach at the golden hour of sunset.");
  const [preset, setPreset] = useState<Preset>("Golden Hour Glow");
  const [hairstyle, setHairstyle] = useState<HairStyle>("Beach waves");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [omissionFiles, setOmissionFiles] = useState<File[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingRef, setIsDraggingRef] = useState<boolean>(false);
  const [isDraggingOmission, setIsDraggingOmission] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'reference' | 'omission') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (fileType === 'reference') {
        setReferenceFiles(files);
      } else {
        setOmissionFiles(files);
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, fileType: 'reference' | 'omission') => {
    e.preventDefault();
    e.stopPropagation();
    if (fileType === 'reference') {
      setIsDraggingRef(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setReferenceFiles(Array.from(e.dataTransfer.files));
      }
    } else {
      setIsDraggingOmission(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setOmissionFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  const handleDragActivity = (e: DragEvent<HTMLDivElement>, isOver: boolean, fileType: 'reference' | 'omission') => {
    e.preventDefault();
    e.stopPropagation();
    if (fileType === 'reference') {
      setIsDraggingRef(isOver);
    } else {
      setIsDraggingOmission(isOver);
    }
  };


  const handleGenerate = useCallback(async () => {
    if (referenceFiles.length === 0) {
        setError("Please upload at least one reference image to create your twin.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // NOTE: In a real app, you would process `referenceFiles` with a multimodal model
      // to dynamically extract features. For this example, we use a mocked analysis.
      const features = analyzeReferenceImages();
      const fullPrompt = buildUltraLuxuryPrompt(features, preset, promptTitle, promptDescription, hairstyle, omissionFiles.length > 0);
      
      console.log("Generated Prompt:", fullPrompt); // For debugging

      const imageUrl = await generateImage(fullPrompt, referenceFiles);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      setError(err.toString() || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [promptTitle, promptDescription, preset, hairstyle, referenceFiles, omissionFiles]);

  const FileUploader = ({ title, description, fileType, files, onFileChange, onDrop, onDragActivity, isDragging }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{title}</label>
      <div
        onDrop={(e) => onDrop(e, fileType)}
        onDragOver={(e) => onDragActivity(e, true, fileType)}
        onDragLeave={(e) => onDragActivity(e, false, fileType)}
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-purple-500' : 'border-gray-600'} border-dashed rounded-md transition-colors`}
      >
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <div className="flex text-sm text-gray-500">
            <label htmlFor={`${fileType}-file-upload`} className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-purple-500 px-1">
              <span>Upload files</span>
              <input id={`${fileType}-file-upload`} name={`${fileType}-file-upload`} type="file" multiple className="sr-only" onChange={(e) => onFileChange(e, fileType)} accept="image/*" />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {files.length > 0 && (
          <div className="mt-3 text-sm text-gray-300">
              <p className="font-semibold">Selected files:</p>
              <ul className="list-disc list-inside text-gray-400 mt-1 space-y-1">
                  {files.map((file) => (
                      <li key={file.name} className="truncate">{file.name}</li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Controls Section */}
      <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-2xl shadow-purple-500/10">
        <div className="space-y-6">
          <FileUploader
            title="Reference Images (Your Twin)"
            description="Images to create an identical twin from."
            fileType="reference"
            files={referenceFiles}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragActivity={handleDragActivity}
            isDragging={isDraggingRef}
          />

          <FileUploader
            title="Omission Images (Features to Avoid)"
            description="Images with features to exclude."
            fileType="omission"
            files={omissionFiles}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragActivity={handleDragActivity}
            isDragging={isDraggingOmission}
          />
          
          <div>
            <label htmlFor="preset" className="block text-sm font-medium text-gray-300 mb-2">Creative Preset</label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            >
              {Presets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
           <div>
            <label htmlFor="hairstyle" className="block text-sm font-medium text-gray-300 mb-2">Hairstyle</label>
            <select
              id="hairstyle"
              value={hairstyle}
              onChange={(e) => setHairstyle(e.target.value as HairStyle)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            >
              {HairStyles.map((style) => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promptTitle" className="block text-sm font-medium text-gray-300 mb-2">Prompt Title</label>
            <input
              type="text"
              id="promptTitle"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
              placeholder="e.g., A Day at the Beach"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
          </div>
          <div>
            <label htmlFor="promptDescription" className="block text-sm font-medium text-gray-300 mb-2">Prompt Description</label>
            <textarea
              id="promptDescription"
              rows={3}
              value={promptDescription}
              onChange={(e) => setPromptDescription(e.target.value)}
              placeholder="e.g., A stunning portrait on a sun-drenched beach..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
                <>
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>Generate Image</span>
                </>
            )}
          </button>
        </div>
      </div>

      {/* Image Display Section */}
      <div className="lg:col-span-2 bg-gray-800/30 rounded-2xl border border-gray-700/50 flex items-center justify-center min-h-[400px] lg:min-h-[600px] p-4">
        {isLoading && <LoadingSpinner />}
        {error && (
            <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Generation Failed</h3>
                <p className="text-sm">{error}</p>
            </div>
        )}
        {!isLoading && !error && generatedImage && (
          <img
            src={generatedImage}
            alt="Generated AI portrait"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black"
          />
        )}
        {!isLoading && !error && !generatedImage && (
          <div className="text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-lg">Your generated image will appear here.</p>
            <p className="text-sm">Upload a reference image and click "Generate Image".</p>
          </div>
        )}
      </div>
    </div>
  );
};
