
import React from 'react';
import { GeneratedImage } from '../types';

interface ImageGalleryProps {
  images: GeneratedImage[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {

  const handleDownload = (src: string, name: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${name.replace(/\s+/g, '-')}-by-InfluenceHer.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  if (images.length === 0) return null;

  return (
    <div className="w-full mt-12">
      <h2 className="text-3xl font-serif text-center text-gray-800 mb-8">Your Lifestyle Scenes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {images.map((image) => (
          <div key={image.id} className="group relative overflow-hidden rounded-2xl shadow-lg aspect-w-1 aspect-h-1">
            <img src={image.src} alt={image.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex flex-col justify-between p-4">
               <p className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
                 {image.prompt}
               </p>
               <button 
                  onClick={() => handleDownload(image.src, image.prompt)}
                  className="self-end p-2 bg-white/80 rounded-full text-brand-deep-pink hover:bg-white transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0"
                  aria-label="Download image"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
