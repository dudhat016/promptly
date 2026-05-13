import React, { useState, useCallback, useEffect } from 'react';
import { GalleryItem, ImageType, ReferenceImage } from '../types';
import { generateImage, generateMagicPrompt, generateJesusPrompt } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Icon } from './common/Icons';
import ScriptureModal from './ScriptureModal';

const attireOptions = [
  "None",
  "Sunday Best (Men & Women)",
  "Bible Study Casual",
  "Choir Rehearsal Wear",
  "Clergy Apparel",
  "Pastor Apparel",
  "Modest Holiness Apparel",
  "Muslim Garb (Hijab, Thobe)",
  "Prayer Night Casual (Denim)",
];

const sceneOptions = [
  "None",
  "Church Sanctuary",
  "Gospel Concert Stage",
  "Church Event Hall",
  "Outdoor Baptism Setting",
  "Simple Studio Backdrop",
];

const coloringStyleOptions = [
  "Detailed Line Art",
  "Inspirational Quotes",
  "Chibi/Cartoon Style",
  "Character Portrait",
  "Biblical Scenes",
  "Stained Glass Style",
  "Praying Hands & Symbols",
];


const ImageGeneratorView: React.FC = () => {
    const [imageType, setImageType] = useState<ImageType>('clipart');
    const [prompt, setPrompt] = useState('');
    const [attire, setAttire] = useState<string>('None');
    const [scene, setScene] = useState<string>('None');
    const [coloringStyle, setColoringStyle] = useState<string>('Detailed Line Art');
    const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [gallery, setGallery] = useState<GalleryItem[]>(() => {
        try {
            const savedGallery = localStorage.getItem('faithAiStudioGallery');
            return savedGallery ? JSON.parse(savedGallery) : [];
        } catch (error) {
            console.error("Error loading gallery from localStorage:", error);
            localStorage.removeItem('faithAiStudioGallery');
            return [];
        }
    });
    const [isScriptureModalOpen, setIsScriptureModalOpen] = useState(false);
    const [isJesusPromptLoading, setIsJesusPromptLoading] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem('faithAiStudioGallery', JSON.stringify(gallery));
        } catch (error) {
            console.error("Error saving gallery to localStorage:", error);
        }
    }, [gallery]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("File is too large. Please upload an image under 4MB.");
                return;
            }
            setError(null);
            const base64Data = await blobToBase64(file);
            setReferenceImage({ data: base64Data, mimeType: file.type });
            setReferenceImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleGenerateMagicPrompt = useCallback(async () => {
        if (!prompt.trim()) {
            setError("Please enter a base idea for your prompt.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Creating a Magic Prompt...');
        try {
            const magicPrompt = await generateMagicPrompt(prompt);
            setPrompt(magicPrompt);
        } catch (err: any) {
            setError(err.message || "Failed to generate magic prompt.");
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    const handleGenerateImage = useCallback(async (p: string, it: ImageType, ri: ReferenceImage | null, currentAttire: string, currentScene: string, currentColoringStyle: string) => {
        if (!p.trim()) {
            setError("The prompt cannot be empty.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Generating your masterpiece...');
        setGeneratedImage(null);

        let finalPrompt = p;
        if (currentAttire && currentAttire !== "None") {
            finalPrompt += `, wearing ${currentAttire.replace(/ \(.+?\)/, '')}`; // Remove parenthetical text for prompt
        }
        if (currentScene && currentScene !== "None") {
            finalPrompt += ` in the setting of a ${currentScene}`;
        }

        try {
            const imageData = await generateImage(finalPrompt, it, ri ?? undefined, currentColoringStyle);
            setGeneratedImage(`data:image/png;base64,${imageData}`);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during image generation.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDescribeJesus = async () => {
        setIsJesusPromptLoading(true);
        setError(null);
        try {
            const jesusDescription = await generateJesusPrompt();
            if (jesusDescription !== "Error generating description.") {
                setPrompt(prev => prev ? `${prev}, ${jesusDescription}` : jesusDescription);
            } else {
                setError("Could not generate a description for Jesus.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate Jesus description.");
        } finally {
            setIsJesusPromptLoading(false);
        }
    };

    const handleSaveToGallery = () => {
        if (!generatedImage) return;
        const newItem: GalleryItem = {
            id: Date.now(),
            src: generatedImage,
            prompt,
            imageType,
            referenceImage,
            attire,
            scene,
            coloringStyle: imageType === 'coloring-page' ? coloringStyle : undefined,
        };
        setGallery(prev => [newItem, ...prev]);
    };

    const handleDeleteFromGallery = (id: number) => {
        setGallery(prev => prev.filter(item => item.id !== id));
    };

    const handleRegenerateFromGallery = (item: GalleryItem) => {
        setPrompt(item.prompt);
        setImageType(item.imageType);
        setAttire(item.attire || 'None');
        setScene(item.scene || 'None');
        setColoringStyle(item.coloringStyle || 'Detailed Line Art');
        setReferenceImage(item.referenceImage);
        if (item.referenceImage) {
            setReferenceImagePreview(`data:${item.referenceImage.mimeType};base64,${item.referenceImage.data}`);
        } else {
            setReferenceImagePreview(null);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleGenerateImage(item.prompt, item.imageType, item.referenceImage, item.attire || 'None', item.scene || 'None', item.coloringStyle || 'Detailed Line Art');
    };

    const ImageTypeButton: React.FC<{ type: ImageType; label: string }> = ({ type, label }) => (
        <button
            onClick={() => setImageType(type)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                imageType === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="container mx-auto flex flex-col gap-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="bg-slate-800/50 p-6 rounded-lg shadow-2xl border border-slate-700 flex flex-col gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">1. Choose Creation Type</label>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-lg">
                            <ImageTypeButton type="clipart" label="Clipart" />
                            <ImageTypeButton type="stock-photo" label="Stock Photo" />
                            <ImageTypeButton type="coloring-page" label="Coloring Page" />
                        </div>
                        {imageType === 'coloring-page' && (
                            <div className="pt-4">
                                <label htmlFor="coloring-style-select" className="text-xs font-semibold text-gray-400">Coloring Page Style</label>
                                <select
                                    id="coloring-style-select"
                                    value={coloringStyle}
                                    onChange={(e) => setColoringStyle(e.target.value)}
                                    className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                >
                                    {coloringStyleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="prompt" className="text-sm font-semibold text-gray-300">2. Describe Your Vision</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A dove flying over a serene valley at sunrise"
                            className="w-full h-24 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
                            <button onClick={handleGenerateMagicPrompt} disabled={isLoading} className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition self-start">
                                <Icon name="magic" className="w-4 h-4" />
                                Generate Magic Prompt
                            </button>
                             <div className="flex items-center gap-4">
                                <button onClick={() => setIsScriptureModalOpen(true)} disabled={isLoading} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition">
                                    <Icon name="book" className="w-4 h-4" />
                                    Add Scripture
                                </button>
                                <button onClick={handleDescribeJesus} disabled={isLoading || isJesusPromptLoading} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition">
                                    <Icon name="user" className="w-4 h-4" />
                                    {isJesusPromptLoading ? 'Thinking...' : 'Describe Jesus'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">3. (Optional) Add Details</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="attire-select" className="text-xs text-gray-400">Attire</label>
                                <select 
                                    id="attire-select"
                                    value={attire}
                                    onChange={(e) => setAttire(e.target.value)}
                                    className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                >
                                    {attireOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="scene-select" className="text-xs text-gray-400">Scene / Background</label>
                                <select
                                    id="scene-select"
                                    value={scene}
                                    onChange={(e) => setScene(e.target.value)}
                                    className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                >
                                    {sceneOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>


                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">4. (Optional) Add a Reference Image</label>
                        <div className="relative border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition">
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label="Upload reference image"
                            />
                            {referenceImagePreview ? (
                                <img src={referenceImagePreview} alt="Reference Preview" className="mx-auto h-24 rounded-md object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <Icon name="upload" className="w-8 h-8"/>
                                    <span className="text-sm">Click to upload or drag & drop</span>
                                    <span className="text-xs">Max 4MB</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => handleGenerateImage(prompt, imageType, referenceImage, attire, scene, coloringStyle)} disabled={isLoading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center">
                        {isLoading ? 'Generating...' : 'Generate Image'}
                    </button>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </div>

                {/* Image Display */}
                <div className="bg-slate-800/50 p-6 rounded-lg shadow-2xl border border-slate-700 flex items-center justify-center min-h-[500px]">
                    {isLoading ? (
                        <div className="text-center space-y-4">
                            <Spinner size="lg" />
                            <p className="text-gray-300 animate-pulse">{loadingMessage}</p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative group">
                            <img src={generatedImage} alt="Generated Art" className="rounded-lg max-w-full max-h-[450px] object-contain shadow-2xl shadow-black/50"/>
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                               <button onClick={handleSaveToGallery} className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-semibold hover:bg-white/30 transition-colors">
                                    <Icon name="save" className="w-5 h-5"/>
                                    Save to Gallery
                                </button>
                                <a href={generatedImage} download="faith-ai-creation.png" className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-semibold hover:bg-white/30 transition-colors">
                                    <Icon name="download" className="w-5 h-5"/>
                                    Download
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Icon name="create" className="w-16 h-16 mx-auto mb-4"/>
                            <h3 className="text-lg font-semibold">Your Creation Will Appear Here</h3>
                            <p className="text-sm">Fill out the details on the left to begin.</p>
                        </div>
                    )}
                </div>
            </div>

            {gallery.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-3xl font-bold text-center mb-6 text-white tracking-wide">My Gallery</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {gallery.map(item => (
                            <div key={item.id} className="relative group aspect-square bg-slate-700 rounded-lg overflow-hidden shadow-lg border border-slate-600">
                                <img src={item.src} alt={item.prompt.substring(0, 50)} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-xs text-gray-200 mb-2 line-clamp-3">{item.prompt}</p>
                                    <div className="flex items-center justify-end gap-2 mt-auto">
                                        <button onClick={() => handleRegenerateFromGallery(item)} className="p-2 bg-white/20 rounded-full hover:bg-blue-500 transition-colors" title="Regenerate">
                                            <Icon name="regenerate" className="w-5 h-5 text-white" />
                                        </button>
                                        <button onClick={() => handleDeleteFromGallery(item.id)} className="p-2 bg-white/20 rounded-full hover:bg-red-500 transition-colors" title="Delete">
                                            <Icon name="delete" className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <ScriptureModal
                isOpen={isScriptureModalOpen}
                onClose={() => setIsScriptureModalOpen(false)}
                onSelect={(scripture) => {
                    setPrompt(prev => prev ? `${prev}. ${scripture}` : scripture);
                }}
            />
        </div>
    );
};

export default ImageGeneratorView;