import React, { useState } from 'react';
import { View } from './types';
import Header from './components/Header';
import ChatView from './components/ChatView';
import ImageGeneratorView from './components/ImageGeneratorView';
import EbookGeneratorView from './components/EbookGeneratorView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('create');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-slate-800 text-white font-sans">
      <Header activeView={activeView} setActiveView={setActiveView} />
      <main className="p-4 sm:p-6 md:p-8 flex-grow">
        {activeView === 'chat' && <ChatView />}
        {activeView === 'create' && <ImageGeneratorView />}
        {activeView === 'ebook' && <EbookGeneratorView />}
      </main>
      <footer className="py-8 text-center text-slate-400 text-sm bg-black/20 backdrop-blur-md border-t border-white/5">
        <p className="font-medium text-slate-300 mb-1">Vibe-coded by LaKeshia Walton · The Vibe Architect™</p>
        <p className="opacity-70">A RenderHaus Original · © 2025 RenderHaus · All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default App;