import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-5xl sm:text-7xl font-display text-purple-400">
        AI Twin Studio
      </h1>
      <p className="text-gray-400 mt-2 text-lg">
        Your Personal AI Twin Playground.
      </p>
    </header>
  );
};
