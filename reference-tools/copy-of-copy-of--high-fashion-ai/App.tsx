import React from 'react';
import Header from './components/Header';
import VirtualStylist from './components/VirtualStylist';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      <div className="container mx-auto px-4 py-8">
        <Header />
        <main className="mt-8">
          <VirtualStylist />
        </main>
      </div>
    </div>
  );
};

export default App;
