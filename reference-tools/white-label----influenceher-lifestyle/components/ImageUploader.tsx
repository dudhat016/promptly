
import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  imagePreview: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, imagePreview }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <div
        className="w-full h-80 border-2 border-dashed border-brand-deep-pink rounded-2xl flex items-center justify-center cursor-pointer bg-brand-blush hover:bg-pink-100 transition-colors duration-300"
        onClick={handleClick}
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Reference Preview" className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <div className="text-center text-brand-text">
            <svg xmlns="http://www.w.org/2000/svg" className="mx-auto h-12 w-12 text-brand-deep-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 font-semibold">Upload Your Reference Photo</p>
            <p className="text-sm">Click here to select an image</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
