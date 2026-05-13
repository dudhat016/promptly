import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md p-4 sticky top-0 z-10 h-[80px] flex items-center">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-pink-500 tracking-tight">
          LuxeLens AI
        </h1>
        <p className="text-sm text-pink-400">AI Luxury Stock Photo Generator</p>
      </div>
    </header>
  );
};