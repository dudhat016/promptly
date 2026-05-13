
import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ImageGenerator } from './components/ImageGenerator';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ImageGenerator />
      </main>
      <Footer />
    </div>
  );
}

export default App;
