
import React, { useState, useEffect } from 'react';

const messages = [
  "Initializing AI model...",
  "Analyzing facial architecture...",
  "Calibrating photorealistic engine...",
  "Applying editorial lighting...",
  "Rendering with luxury post-processing...",
  "Finalizing high-resolution details...",
  "Almost there..."
];

export const LoadingSpinner: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
      <p className="text-lg font-medium text-gray-300">Generating Your Image</p>
      <p className="text-sm text-gray-400 transition-opacity duration-500">{messages[messageIndex]}</p>
    </div>
  );
};
