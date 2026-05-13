import React, { useState } from 'react';
import Generator from './components/Generator';
import Editor from './components/Editor';
import Header from './components/Header';
import { PhotoIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

type Tab = 'generator' | 'editor';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <Generator />;
      case 'editor':
        return <Editor />;
      default:
        return <Generator />;
    }
  };

  const TabButton: React.FC<{
    tabName: Tab;
    label: string;
    icon: React.ElementType;
  }> = ({ tabName, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        activeTab === tabName
          ? 'bg-red-600 text-white shadow-lg'
          : 'bg-white/10 text-gray-200 hover:bg-white/20'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
            <TabButton tabName="generator" label="AI Photo Studio" icon={PhotoIcon} />
            <TabButton tabName="editor" label="AI Image Editor" icon={PencilSquareIcon} />
          </div>
          <main>{renderContent()}</main>
        </div>
      </div>
    </div>
  );
};

export default App;