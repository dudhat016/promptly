
import React from 'react';

const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-gold" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1114 0A7 7 0 012 9zm10.5-5.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5zm2.475 2.475a.5.5 0 01.707-.707l1.414 1.414a.5.5 0 01-.707.707l-1.414-1.414zM14.5 9a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5zm2.475 2.475a.5.5 0 01.707.707l1.414-1.414a.5.5 0 01-.707-.707l-1.414 1.414zM9 14.5a.5.5 0 01-.5-.5v-2a.5.5 0 011 0v2a.5.5 0 01-.5.5zm-2.475-2.475a.5.5 0 01-.707.707l-1.414-1.414a.5.5 0 11.707-.707l1.414 1.414zM3.5 9a.5.5 0 01-.5-.5v-2a.5.5 0 011 0v2a.5.5 0 01-.5.5zM3.025 6.525a.5.5 0 01-.707-.707l1.414-1.414a.5.5 0 11.707.707L3.025 6.525z" clipRule="evenodd" />
        <path d="M19.5 2.5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-2 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-12-6a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
    </svg>
);


const Header: React.FC = () => {
  return (
    <header className="py-6 text-center">
        <div className="flex items-center justify-center gap-3">
            <SparkleIcon />
            <h1 className="text-4xl md:text-5xl font-serif text-gray-800">InfluenceHer Lifestyle</h1>
            <SparkleIcon />
        </div>
        <p className="text-md md:text-lg text-brand-text mt-2">The AI twin scene-creator for digital storytellers.</p>
    </header>
  );
};

export default Header;
