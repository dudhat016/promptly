
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900/50 border-t border-gray-800">
      <div className="container mx-auto px-4 py-4 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Luxury AI Twin Generator. All rights reserved.</p>
        <p className="mt-1">Powered by Gemini</p>
      </div>
    </footer>
  );
};
