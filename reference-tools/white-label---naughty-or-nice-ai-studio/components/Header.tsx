import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-fancy text-red-500">
        Naughty Or Nice
      </h1>
      <p className="mt-2 text-lg text-gray-300">Your AI Holiday Photo Studio</p>
    </header>
  );
};

export default Header;