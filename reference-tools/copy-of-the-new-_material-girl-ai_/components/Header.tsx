import React from 'react';
import { SparklesIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-fancy font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-500 to-purple-500 flex items-center justify-center gap-4">
        <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400" />
        Material Girl AI
        <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-fuchsia-400" />
      </h1>
      <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
        Your personal AI fashion studio. Restyle outfits, generate luxury looks, and create stunning video clips from a single image.
      </p>
    </header>
  );
};