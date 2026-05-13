import React from 'react';
import { Tab } from '../types';
import Icon from './Icon';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = Object.values(Tab);

  const getIconName = (tab: Tab) => {
    switch (tab) {
      case Tab.CHAT: return 'chat';
      case Tab.GENERATE: return 'generate';
      case Tab.ANALYZE: return 'analyze';
      case Tab.EDIT: return 'edit';
      default: return '';
    }
  };

  return (
    <header className="bg-gray-900/70 backdrop-blur-lg sticky top-0 z-50 shadow-lg shadow-pink-500/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">
            <span className="text-pink-400">BODIED</span>
          </h1>
          <nav className="hidden md:flex items-center space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon name={getIconName(tab)} className="w-5 h-5" />
                <span>{tab}</span>
              </button>
            ))}
          </nav>
        </div>
         <nav className="md:hidden flex items-center justify-around pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg text-xs font-medium transition-all duration-300 w-1/4 ${
                  activeTab === tab
                    ? 'text-pink-400'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Icon name={getIconName(tab)} className="w-6 h-6" />
                <span>{tab}</span>
              </button>
            ))}
          </nav>
      </div>
    </header>
  );
};

export default Header;