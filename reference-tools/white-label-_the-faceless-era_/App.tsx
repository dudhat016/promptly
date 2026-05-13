import React, { useState } from 'react';
import { Image, Edit3, MessageSquare, Bot } from 'lucide-react';
import Generator from './components/Generator';
import Editor from './components/Editor';
import Analyzer from './components/Analyzer';
import Chatbot from './components/Chatbot';

type Tab = 'generate' | 'edit' | 'analyze' | 'chat';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');

  const renderContent = () => {
    switch (activeTab) {
      case 'generate':
        return <Generator />;
      case 'edit':
        return <Editor />;
      case 'analyze':
        return <Analyzer />;
      case 'chat':
        return <Chatbot />;
      default:
        return <Generator />;
    }
  };

  const NavButton = ({ tab, icon, label }: { tab: Tab, icon: React.ElementType, label: string }) => {
    const IconComponent = icon;
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-pink-600 text-white shadow-lg'
            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <IconComponent className="w-5 h-5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-56 bg-gray-800/50 backdrop-blur-sm border-b md:border-r border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-white mb-8 text-center md:text-left">
          Faceless<span className="text-pink-500">Era</span>
        </h1>
        <nav className="flex flex-row md:flex-col justify-around md:justify-start md:space-y-2">
          <NavButton tab="generate" icon={Image} label="Generator" />
          <NavButton tab="edit" icon={Edit3} label="Editor" />
          <NavButton tab="analyze" icon={Bot} label="Analyzer" />
          <NavButton tab="chat" icon={MessageSquare} label="Chat" />
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;