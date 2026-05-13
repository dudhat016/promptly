import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">
        High Fashion AI
      </h1>
      <p className="mt-4 text-lg text-gray-400">Your Personal AI Virtual Try-On Studio</p>
    </header>
  );
};

export default Header;
