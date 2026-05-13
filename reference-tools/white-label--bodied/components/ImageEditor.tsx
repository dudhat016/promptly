
import React, { useState, useRef, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import Spinner from './Spinner';

const backgroundColors = ['#FFFFFF', '#000000', '#F472B6', '#8B5CF6', '#3B82F6', '#10B981', 'transparent'];

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null); // This will hold the transparent image
  const [finalImage, setFinalImage] = useState<string | null>(null); // This holds the composited image
  const [prompt, setPrompt] = useState('Add a retro, grainy film filter.');
  const [activeJob, setActiveJob] = useState<'edit' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>('transparent');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = activeJob !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
      setOriginalPreview(URL.createObjectURL(file));
      setEditedImage(null);
      setFinalImage(null);
      setError(null);
      setBackgroundColor('transparent');
    }
  };
  
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };


  useEffect(() => {
    if (editedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = editedImage;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (backgroundColor !== 'transparent') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
           ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        setFinalImage(canvas.toDataURL('image/png'));
      };
    }
  }, [editedImage, backgroundColor]);


  const performEdit = async (editPrompt: string, jobType: 'edit' | 'remove') => {
    if (!originalImage) {
      setError("Please upload an image first.");
      return;
    }
    setActiveJob(jobType);
    setError(null);
    setEditedImage(null);
    setFinalImage(null);

    try {
      const resultUrl = await editImage(originalImage, editPrompt);
      setEditedImage(resultUrl);
       if (jobType === 'edit') {
        setFinalImage(resultUrl); // For regular edits, the result is the final image
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setActiveJob(null);
    }
  };
  
  const handleEdit = () => {
    setBackgroundColor('transparent');
    performEdit(prompt, 'edit');
  };

  const handleRemoveBackground = () => {
    performEdit("remove the background, making the new background transparent", 'remove');
  };


  return (
    <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Upload Image to Edit</h2>
            <div 
                className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900/50 relative p-2 cursor-pointer hover:border-pink-500 transition-colors"
                onClick={handleUploadButtonClick}
            >
                {originalPreview ? (
                <img src={originalPreview} alt="Original" className="max-w-full max-h-full object-contain rounded-lg" />
                ) : (
                <div className="text-center text-gray-400 p-4">
                    <p className="font-semibold">Drag & drop your image here</p>
                    <p className="text-sm text-gray-500">or click to upload</p>
                </div>
                )}
                <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
                />
            </div>
             <button
              onClick={handleUploadButtonClick}
              disabled={isLoading}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              {originalImage ? 'Change Image' : 'Upload Image'}
            </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Editing Prompt</h2>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Remove the person in the background"
                className="w-full h-24 bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
                disabled={isLoading}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={handleEdit}
                disabled={isLoading || !originalImage}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {activeJob === 'edit' ? 'Applying Edit...' : 'Apply Custom Edit'}
            </button>
             <button
                onClick={handleRemoveBackground}
                disabled={isLoading || !originalImage}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {activeJob === 'remove' ? 'Removing Background...' : 'Remove Background'}
            </button>
        </div>


        {error && <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}
        
        {editedImage && !isLoading && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-xl font-bold text-white mb-4">Choose Background Color</h2>
                 <div className="flex flex-wrap gap-3 items-center">
                    {backgroundColors.map(color => (
                        <button key={color} onClick={() => setBackgroundColor(color)} className={`w-10 h-10 rounded-full border-2 transition-transform transform hover:scale-110 ${backgroundColor === color ? 'border-pink-400 scale-110' : 'border-gray-500'}`} style={{backgroundColor: color === 'transparent' ? '#374151' : color}}>
                           {color === 'transparent' && <div className="w-full h-full bg-transparent-pattern rounded-full" style={{backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'}}></div>}
                        </button>
                    ))}
                     <input type="color" onChange={(e) => setBackgroundColor(e.target.value)} value={backgroundColor} className="w-10 h-10 p-0 border-none rounded-full cursor-pointer bg-gray-700" />
                 </div>
            </div>
        )}

        <div className="bg-gray-800 p-4 rounded-lg shadow-xl min-h-[300px] flex items-center justify-center" style={{ background: backgroundColor === 'transparent' ? `url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".1"><rect width="8" height="8" fill="%23fff"/><rect x="8" y="8" width="8" height="8" fill="%23fff"/></svg>')` : 'none'}}>
            <canvas ref={canvasRef} className="hidden" />
            {isLoading ? (
            <Spinner />
            ) : finalImage ? (
            <img src={finalImage} alt="Edited" className="max-w-full max-h-[70vh] rounded-lg shadow-lg" />
            ) : (
            <div className="text-center text-gray-500">
                <p>Your edited image will appear here.</p>
            </div>
            )}
        </div>
    </div>
  );
};

export default ImageEditor;
