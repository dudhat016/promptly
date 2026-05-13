
import React from 'react';
import { CameraIcon, ExclamationIcon } from './icons';

interface ImageDisplayProps {
  generatedImage: string | null;
  isLoading: boolean;
  error: string | null;
}

const Placeholder = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-pink-400">
        <CameraIcon className="w-24 h-24 mb-4"/>
        <h3 className="text-xl font-semibold text-pink-700">Your Image Awaits</h3>
        <p className="mt-2 max-w-sm text-pink-500">
            Select makeup, hairstyle, and other details from the panel to generate your unique luxury photo.
        </p>
    </div>
);

const Loader = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-pink-500">
        <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-pink-500 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-xl font-semibold mt-6">Crafting Your Image...</h3>
        <p className="mt-2 text-sm text-pink-600">The AI is working its magic. This may take a moment.</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-red-500 bg-red-50 rounded-lg">
        <ExclamationIcon className="w-16 h-16 mb-4"/>
        <h3 className="text-xl font-semibold text-red-700">Oops! Something went wrong.</h3>
        <p className="mt-2 text-red-600">{message}</p>
    </div>
);


export const ImageDisplay: React.FC<ImageDisplayProps> = ({ generatedImage, isLoading, error }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-pink-50 p-4 lg:p-8">
      <div className="w-full max-w-lg aspect-[3/4] bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
        {isLoading && <Loader />}
        {!isLoading && error && <ErrorDisplay message={error} />}
        {!isLoading && !error && generatedImage && (
          <img 
            src={generatedImage} 
            alt="Generated Luxury Model" 
            className="w-full h-full object-cover"
          />
        )}
        {!isLoading && !error && !generatedImage && <Placeholder />}
      </div>
    </div>
  );
};