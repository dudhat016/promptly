
import React, { useState } from 'react';
import { Tab } from './types';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import ImageGenerator from './components/ImageGenerator';
import ImageAnalyzer from './components/ImageAnalyzer';
import ImageEditor from './components/ImageEditor';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.CHAT:
        return <Chatbot />;
      case Tab.GENERATE:
        return <ImageGenerator />;
      case Tab.ANALYZE:
        return <ImageAnalyzer />;
      case Tab.EDIT:
        return <ImageEditor />;
      default:
        return null;
    }
  };

  const isChat = activeTab === Tab.CHAT;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className={`flex-grow container mx-auto p-4 md:p-6 ${isChat ? 'flex flex-col' : ''}`}>
        <div className={isChat ? 'flex-grow' : ''}>
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
