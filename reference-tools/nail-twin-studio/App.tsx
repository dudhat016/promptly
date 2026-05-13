import React, { useState } from 'react';
import NailStudio from './components/NailStudio';
import ImageEditor from './components/ImageEditor';
import ChatBot from './components/ChatBot';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.STUDIO);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons text-rose-500 text-3xl">spa</span>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600 tracking-tight">
              Nail Twin Studio
            </h1>
          </div>
          <nav className="hidden md:flex space-x-1">
             {[
               { id: AppTab.STUDIO, label: 'Studio', icon: 'brush' },
               { id: AppTab.EDITOR, label: 'Editor', icon: 'auto_fix_high' },
               { id: AppTab.CHAT, label: 'Assistant', icon: 'chat_bubble' },
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 ${
                   activeTab === tab.id 
                     ? 'bg-rose-500 text-white shadow-md' 
                     : 'text-gray-600 hover:bg-rose-50'
                 }`}
               >
                 <span className="material-icons text-sm">{tab.icon}</span>
                 <span className="font-medium">{tab.label}</span>
               </button>
             ))}
          </nav>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around z-50">
        {[
           { id: AppTab.STUDIO, label: 'Studio', icon: 'brush' },
           { id: AppTab.EDITOR, label: 'Editor', icon: 'auto_fix_high' },
           { id: AppTab.CHAT, label: 'Chat', icon: 'chat_bubble' },
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 rounded-lg w-full ${
                    activeTab === tab.id ? 'text-rose-600 bg-rose-50' : 'text-gray-500'
                }`}
            >
                <span className="material-icons">{tab.icon}</span>
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="animate-fade-in">
            {activeTab === AppTab.STUDIO && (
                <div className="space-y-4">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-serif text-gray-800 mb-2">Virtual Nail Try-On</h2>
                        <p className="text-gray-500 max-w-lg mx-auto">
                            Upload your hand reference and a design to visualize your next manicure with photorealistic AI.
                        </p>
                    </div>
                    <NailStudio />
                </div>
            )}
            {activeTab === AppTab.EDITOR && (
                <div className="space-y-4">
                     <div className="text-center mb-10">
                        <h2 className="text-4xl font-serif text-gray-800 mb-2">Creative Suite</h2>
                        <p className="text-gray-500">Edit existing photos or generate new art from scratch.</p>
                    </div>
                    <ImageEditor />
                </div>
            )}
            {activeTab === AppTab.CHAT && (
                <div className="space-y-4">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-serif text-gray-800 mb-2">Beauty Assistant</h2>
                        <p className="text-gray-500">Ask for advice, trends, and nail care tips.</p>
                    </div>
                    <ChatBot />
                </div>
            )}
        </div>
      </main>
      
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    </div>
  );
};

export default App;
