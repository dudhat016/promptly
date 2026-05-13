import React, { useState, useCallback, ChangeEvent } from 'react';
import { UploadCloud, Edit3, AlertTriangle, Sparkles, BookOpen, Download, RefreshCw } from 'lucide-react';
import { fileToGenerativePart, editImage, generateCaption } from '../services/geminiService';
import Loader from './ui/Loader';
import { CaptionOutput } from '../types';

const Editor: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [captionOutput, setCaptionOutput] = useState<CaptionOutput | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setEditedImage(null); 
            setCaptionOutput(null);
            setError(null);
        }
    };

    const handleEdit = useCallback(async () => {
        if (!imageFile) {
            setError("Please upload an image first.");
            return;
        }
        if (!prompt.trim()) {
            setError("Please enter an editing prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImage(null);
        setCaptionOutput(null);

        try {
            const imagePart = await fileToGenerativePart(imageFile);
            const result = await editImage(imagePart, prompt);
            setEditedImage(result);
        } catch (err) {
            console.error(err);
            setError("Failed to edit the image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, prompt]);

    const handleGenerateCaption = async () => {
        if (!prompt) return;
        setIsGeneratingCaption(true);
        setCaptionOutput(null);
        try {
            const result = await generateCaption(`An image was edited with the instruction: "${prompt}"`);
            setCaptionOutput(result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingCaption(false);
        }
    };

    const handleDownload = (imageUrl: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'faceless-era-edited.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">AI Image Editor</h2>
                <p className="text-gray-400 mt-2">Modify your images with simple text prompts.</p>
            </div>

            <div className="max-w-2xl mx-auto p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl space-y-6">
                <label htmlFor="image-upload-editor" className="cursor-pointer block">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-pink-500 transition">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <span className="mt-2 block text-sm font-medium text-gray-300">
                            {imageFile ? `Selected: ${imageFile.name}` : 'Click to upload your image'}
                        </span>
                    </div>
                    <input id="image-upload-editor" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </label>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Make the background black and white, add a gold frame..."
                    className="w-full h-20 p-3 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                    disabled={!imageFile}
                />

                <button
                    onClick={handleEdit}
                    disabled={isLoading || !imageFile || !prompt.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white font-bold py-3 px-4 rounded-md hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                    {isLoading ? <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> Editing...</> : <><Edit3 className="w-5 h-5" /> Edit Image</>}
                </button>
            </div>

            {isLoading && <Loader text="Applying your edits..." />}
            {error && <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-red-400 bg-red-900/50 border border-red-700 p-4 rounded-lg"><AlertTriangle className="w-5 h-5" />{error}</div>}

            {(imagePreview || editedImage) && !isLoading && !error && (
                 <div className="max-w-5xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center justify-center bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <h3 className="text-lg font-semibold text-gray-300 mb-4">Original</h3>
                            {imagePreview && <img src={imagePreview} alt="Original" className="rounded-lg w-full" />}
                        </div>
                        <div className="flex flex-col items-center bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <div className="w-full flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-300">Edited</h3>
                                {editedImage && (
                                    <button
                                        onClick={handleEdit}
                                        disabled={isLoading}
                                        className="flex items-center justify-center gap-2 text-sm bg-gray-700 text-white font-medium py-2 px-3 rounded-md hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Regenerate</span>
                                    </button>
                                )}
                            </div>
                            
                            {editedImage ? (
                                <div className="relative group rounded-lg overflow-hidden w-full">
                                    <img src={editedImage} alt="Edited by AI" className="rounded-lg w-full" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button onClick={() => handleDownload(editedImage)} className="flex items-center gap-2 py-2 px-4 bg-white/10 backdrop-blur-sm rounded-md text-white hover:bg-white/20 transition">
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">Your edited image will appear here.</div>
                            )}
                        </div>
                    </div>
                    {editedImage && (
                        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 space-y-3">
                             <button
                                onClick={handleGenerateCaption}
                                disabled={isGeneratingCaption}
                                className="w-full flex items-center justify-center gap-2 bg-gray-600/50 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-600 transition"
                            >
                                <Sparkles className="w-5 h-5 text-pink-400" />
                                {isGeneratingCaption ? 'Generating Content...' : 'Generate Caption, Hooks & CTAs'}
                            </button>
                             {isGeneratingCaption && <div className="text-sm text-center text-gray-400">Writing something catchy...</div>}
                             {captionOutput && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2"><BookOpen className="w-5 h-5 text-pink-400"/> AI-Generated Content</h3>
                                    <div>
                                        <h4 className="font-semibold text-gray-400 text-sm">Caption:</h4>
                                        <p className="mt-1 text-gray-200 p-3 bg-gray-900/50 rounded-md">{captionOutput.caption}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-400 text-sm">Hooks:</h4>
                                        <ul className="list-disc list-inside mt-1 text-gray-300 space-y-1 p-3 bg-gray-900/50 rounded-md">
                                            {captionOutput.hooks.map((h, i) => <li key={i}>{h}</li>)}
                                        </ul>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold text-gray-400 text-sm">Calls to Action:</h4>
                                        <ul className="list-disc list-inside mt-1 text-gray-300 space-y-1 p-3 bg-gray-900/50 rounded-md">
                                            {captionOutput.ctas.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default Editor;