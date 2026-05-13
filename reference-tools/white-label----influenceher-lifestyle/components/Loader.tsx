
import React, { useState, useEffect } from 'react';

const loadingMessages = [
    "Scouting the perfect locations...",
    "Styling your next look...",
    "Setting up the golden hour lighting...",
    "Directing your photoshoot...",
    "Choosing the best angles...",
    "Adding the final touches...",
    "Your lifestyle awaits...",
];

const Loader: React.FC = () => {
  const [message, setMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(prevMessage => {
        const currentIndex = loadingMessages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        return loadingMessages[nextIndex];
      });
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-deep-pink"></div>
      <p className="mt-6 text-lg font-semibold text-brand-text transition-opacity duration-500">{message}</p>
    </div>
  );
};

export default Loader;
