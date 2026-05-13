import React from 'react';
import { AppState } from '../types';
import { LoaderIcon, ErrorIcon, DownloadIcon, ArrowPathIcon } from './icons';

interface ResultDisplayProps extends AppState {
    onUseAsInput: (imageUrl: string) => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  isLoading,
  loadingMessage,
  error,
  editedImages,
  generatedVideoUrl,
  originalImages,
  onUseAsInput,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-400 gap-4">
        <LoaderIcon className="w-12 h-12 animate-spin text-pink-400" />
        <p className="font-medium text-lg">{loadingMessage || 'Processing...'}</p>
        <p className="text-sm">Please wait, this can take a few moments.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-red-400 gap-4 p-4 bg-red-900/20 rounded-lg max-w-lg">
        <ErrorIcon className="w-12 h-12" />
        <p className="font-semibold">An Error Occurred</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (editedImages && editedImages.length > 0) {
    const gridClass = editedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1';
    return (
      <div className={`w-full h-full p-4 grid ${gridClass} gap-4 overflow-y-auto`}>
        {editedImages.map((image, index) => (
          <div key={index} className="relative group w-full h-full flex items-center justify-center aspect-square">
            <img src={image} alt={`Edited result ${index + 1}`} className="max-w-full max-h-full rounded-lg object-contain" />
            <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <button
                onClick={() => onUseAsInput(image)}
                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-all"
                aria-label="Use as new input"
                title="Use as new input"
              >
                <ArrowPathIcon className="w-6 h-6" />
              </button>
              <a
                href={image}
                download={`material-girl-ai-image-${index + 1}.png`}
                className="bg-pink-600 text-white p-3 rounded-full shadow-lg hover:bg-pink-700 transition-all"
                aria-label="Download Image"
              >
                <DownloadIcon className="w-6 h-6" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (generatedVideoUrl) {
    return (
         <div className="relative group w-full h-full flex items-center justify-center">
            <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full max-h-[calc(100vh-220px)] rounded-lg object-contain" />
            <a
              href={generatedVideoUrl}
              download="material-girl-ai-video.mp4"
              className="absolute bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center gap-2"
              aria-label="Download Video"
            >
              <DownloadIcon className="w-6 h-6" />
            </a>
        </div>
    );
  }

  if (originalImages.length > 0) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
            <img src={URL.createObjectURL(originalImages[0])} alt="Original image" className="max-w-full max-h-[calc(100vh-220px)] rounded-lg object-contain" />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg">
                <p className="font-fancy text-2xl text-white">Your canvas is ready.</p>
                <p className="text-gray-300">Use the control panel to start designing your masterpiece.</p>
            </div>
        </div>
      );
  }

  // This should not be reached if the parent component logic is correct
  return null;
};
