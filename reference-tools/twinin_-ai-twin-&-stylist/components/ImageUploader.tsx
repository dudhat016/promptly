import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  id: string;
  label: string;
  onFileSelect: (file: File | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onFileSelect }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onFileSelect(null);
      setPreview(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-semibold text-[#D4007F] mb-1">{label}</label>
      <div
        onClick={handleClick}
        className="mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-pink-300 border-dashed rounded-xl cursor-pointer hover:bg-pink-50 transition-colors h-48 bg-white"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
        ) : (
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-pink-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs text-pink-500">
              Click to upload
            </p>
          </div>
        )}
      </div>
      <input
        id={id}
        name={id}
        type="file"
        className="sr-only"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
      />
    </div>
  );
};