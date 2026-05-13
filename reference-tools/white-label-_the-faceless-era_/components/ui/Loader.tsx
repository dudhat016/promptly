
import React from 'react';

const Loader: React.FC<{ text?: string }> = ({ text = "Generating..." }) => (
  <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-800/50 rounded-lg">
    <div className="w-12 h-12 border-4 border-t-pink-500 border-gray-600 rounded-full animate-spin"></div>
    <p className="text-gray-300 font-medium">{text}</p>
  </div>
);

export default Loader;
