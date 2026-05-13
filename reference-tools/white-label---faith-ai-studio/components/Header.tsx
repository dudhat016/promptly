import React from 'react';
import { View } from '../types';
import { Icon } from './common/Icons';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  const NavButton: React.FC<{
    viewName: View;
    icon: 'chat' | 'create' | 'book';
    label: string;
  }> = ({ viewName, icon, label }) => {
    const isActive = activeView === viewName;
    return (
      <button
        onClick={() => setActiveView(viewName)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/80'
        }`}
      >
        <Icon name={icon} className="w-5 h-5" />
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
             <Icon name="bot" className="w-6 h-6 text-white"/>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            Faith AI <span className="text-blue-400">Studio</span>
          </h1>
        </div>
        <nav className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg">
          <NavButton viewName="create" icon="create" label="Create" />
          <NavButton viewName="ebook" icon="book" label="Ebook" />
          <NavButton viewName="chat" icon="chat" label="Chat" />
        </nav>
      </div>
    </header>
  );
};

export default Header;