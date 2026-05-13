import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImageUpload: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  previews: string[];
  files: File[];
  maxImages: number;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onImageRemove, previews, files, maxImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onImageUpload(event.target.files);
      // Reset the input value to allow re-uploading the same file if needed
      event.target.value = '';
    }
  };

  const handleClick = () => {
    if (files.length < maxImages) {
        fileInputRef.current?.click();
    }
  };

  const canUploadMore = files.length < maxImages;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-200">1. Upload Photos ({files.length}/{maxImages})</h2>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        multiple
        disabled={!canUploadMore}
      />
      <div
        onClick={handleClick}
        className={`w-full h-32 border-2 ${canUploadMore ? 'border-gray-700 cursor-pointer hover:border-purple-500' : 'border-gray-800 cursor-default bg-gray-900/50'} rounded-lg flex items-center justify-center transition-colors duration-300 bg-gray-900`}
      >
        <div className="text-center">
            <UploadIcon />
            <p className="mt-2 text-gray-400">
                {canUploadMore ? 'Click to add source images' : 'Maximum number of images reached'}
            </p>
            <p className="text-xs text-gray-500">More images provide better results</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
            {previews.map((src, index) => (
                <div key={src} className="relative aspect-square group">
                    <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                            onClick={() => onImageRemove(index)}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            aria-label="Remove image"
                        >
                           <CloseIcon/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
