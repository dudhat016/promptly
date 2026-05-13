import React from 'react';

export const Header: React.FC = () => (
  <header className="text-center">
    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4007F] to-[#FF4FA3]">
      Twinin ✨
    </h1>
    <p className="mt-2 text-lg text-pink-600 max-w-2xl mx-auto">
      Your AI twin &amp; outfit stylist. Create hyper-realistic versions of yourself and dress like a luxury boss babe.
    </p>
  </header>
);