import React, { useCallback, useState, useEffect } from 'react';
import { UploadIcon, XCircleIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  originalImages: File[];
  onRemoveImage: (index: number) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, originalImages, onRemoveImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    // Generate previews for the images
    const newPreviews = originalImages.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Cleanup object URLs on unmount or when images change
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [originalImages]);


  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageUpload(file);
      } else {
        alert('Please upload a valid image file.');
      }
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  const canUpload = originalImages.length < 2;

  // Full-screen uploader for when no images are present
  if (originalImages.length === 0) {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <label
                htmlFor="image-upload-main"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-300
                ${isDragging ? 'border-pink-500 bg-gray-900' : 'border-gray-700 hover:border-pink-400 hover:bg-black/20'}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                    <UploadIcon className="w-12 h-12 mb-4" />
                    <p className="mb-2 text-lg"><span className="font-semibold text-pink-400">Click to upload an image</span></p>
                    <p className="text-base">or drag and drop</p>
                    <p className="text-sm mt-4">Upload up to 2 images for couple shots (PNG, JPG)</p>
                </div>
                <input
                id="image-upload-main"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files)}
                />
            </label>
        </div>
    );
  }

  // Smaller uploader for the sidebar
  return (
    <div className="w-full bg-black/20 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-fancy font-bold text-pink-400">Your Images</h2>
        {originalImages.length > 0 && (
             <button onClick={() => onRemoveImage(-1)} className="text-sm text-gray-400 hover:text-white transition-colors">Clear All</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {previews.map((preview, index) => (
          <div key={index} className="relative group aspect-square">
            <img src={preview} alt={`Preview ${index + 1}`} className="object-cover h-full w-full rounded-lg" />
            <button
              onClick={() => onRemoveImage(index)}
              className="absolute top-1 right-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        ))}
      </div>

      {canUpload && (
          <label
            htmlFor="image-upload-sidebar"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
              ${isDragging ? 'border-pink-500 bg-gray-900' : 'border-gray-700 hover:border-pink-400 hover:bg-black/20'}`}
          >
              <div className="flex flex-col items-center justify-center text-gray-400">
                <UploadIcon className="w-8 h-8" />
                <p className="text-xs mt-1">Add another image</p>
              </div>
            <input
              id="image-upload-sidebar"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files)}
            />
          </label>
      )}
    </div>
  );
};