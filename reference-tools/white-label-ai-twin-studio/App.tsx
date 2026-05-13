import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptInput } from './components/PromptInput';
import { GenerateButton } from './components/GenerateButton';
import { ResultDisplay } from './components/ResultDisplay';
import { GenerationSettings } from './components/GenerationSettings';
import { AdvancedSettings } from './components/AdvancedSettings';
import { generateTwinImage, generateMagicPrompt } from './services/geminiService';

export interface GalleryItem {
  id: string;
  imageSrc: string;
  prompt: string;
  aspectRatio: string;
  hairstyle?: string;
  nails?: string;
  outfit?: string;
  skinComplexion?: string;
}

export type LoadingState = 'regenerating' | 'changing outfit' | 'changing hair color' | 'changing outfit color' | false;

const MAX_IMAGES = 8;
const GALLERY_STORAGE_LIMIT = 24;

const App: React.FC = () => {
  const [originalImages, setOriginalImages] = useState<File[]>([]);
  const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [numberOfImages, setNumberOfImages] = useState<number>(2);
  const [matchOriginalFace, setMatchOriginalFace] = useState<boolean>(true);
  const [matchSkinTone, setMatchSkinTone] = useState<boolean>(true);

  // Advanced Settings State
  const [hairstyle, setHairstyle] = useState('Default');
  const [nails, setNails] = useState('Default');
  const [outfit, setOutfit] = useState('Default');
  const [skinComplexion, setSkinComplexion] = useState('Default');

  const [latestCreations, setLatestCreations] = useState<GalleryItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMagicPromptLoading, setIsMagicPromptLoading] = useState<boolean>(false);
  const [itemIsLoading, setItemIsLoading] = useState<Record<string, LoadingState>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedGallery = localStorage.getItem('ai-twin-studio-gallery');
      if (storedGallery) {
        setGallery(JSON.parse(storedGallery));
      }
    } catch (e) {
      console.error("Failed to load gallery from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      const galleryToStore = gallery.slice(0, GALLERY_STORAGE_LIMIT);
      localStorage.setItem('ai-twin-studio-gallery', JSON.stringify(galleryToStore));
    } catch (e) {
      console.error("Failed to save gallery to localStorage", e);
    }
  }, [gallery]);

  const handleImageUpload = (files: FileList) => {
    const newFiles = Array.from(files);
    const combined = [...originalImages, ...newFiles].slice(0, MAX_IMAGES);
    
    setOriginalImages(combined);
    
    // Clean up old object URLs before creating new ones
    originalImagePreviews.forEach(URL.revokeObjectURL);
    setOriginalImagePreviews(combined.map(file => URL.createObjectURL(file)));
    
    setError(null);
  };

  const handleImageRemove = (indexToRemove: number) => {
    const newImages = originalImages.filter((_, index) => index !== indexToRemove);
    const newPreviews = originalImagePreviews.filter((_, index) => index !== indexToRemove);
    URL.revokeObjectURL(originalImagePreviews[indexToRemove]);

    setOriginalImages(newImages);
    setOriginalImagePreviews(newPreviews);
  };

  const handleMagicPrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsMagicPromptLoading(true);
    setError(null);
    try {
      const magicPrompt = await generateMagicPrompt(prompt);
      setPrompt(magicPrompt.trim());
    } catch (e) {
      console.error(e);
      setError('Failed to generate magic prompt. Please try again.');
    } finally {
      setIsMagicPromptLoading(false);
    }
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (originalImages.length === 0) {
      setError('Please upload at least one image to begin.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLatestCreations([]);

    const generationOptions = { hairstyle, nails, outfit, skinComplexion };
    const effectivePrompt = prompt.trim() || 'A beautiful, photorealistic studio shot.';

    try {
      const promises = Array.from({ length: numberOfImages }, () =>
        generateTwinImage(originalImages, effectivePrompt, aspectRatio, generationOptions, matchOriginalFace, matchSkinTone)
      );
      const results = await Promise.all(promises);
      const newItems: GalleryItem[] = results.map(imageSrc => ({
        id: crypto.randomUUID(),
        imageSrc,
        prompt: effectivePrompt,
        aspectRatio,
        ...generationOptions
      }));
      setLatestCreations(newItems);
      setGallery(prev => [...newItems, ...prev]);
    } catch (e) {
      console.error(e);
      setError('Failed to generate images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [originalImages, prompt, aspectRatio, numberOfImages, hairstyle, nails, outfit, skinComplexion, matchOriginalFace, matchSkinTone]);
  
  const handleAction = useCallback(async (item: GalleryItem, action: 'regenerate' | 'change_outfit' | 'change_hair_color' | 'change_outfit_color') => {
    if (originalImages.length === 0) {
        setError('Please re-select your source image(s) to perform this action.');
        return;
    }
    
    let loadingState: LoadingState = 'regenerating';
    if (action === 'change_outfit') loadingState = 'changing outfit';
    if (action === 'change_hair_color') loadingState = 'changing hair color';
    if (action === 'change_outfit_color') loadingState = 'changing outfit color';

    setItemIsLoading(prev => ({ ...prev, [item.id]: loadingState }));
    setError(null);

    const generationOptions = { 
        hairstyle: item.hairstyle, 
        nails: item.nails, 
        outfit: item.outfit, 
        skinComplexion: item.skinComplexion,
        action: action === 'regenerate' ? undefined : action,
    };
    
    try {
        const result = await generateTwinImage(originalImages, item.prompt, item.aspectRatio, generationOptions, matchOriginalFace, matchSkinTone);
        const newItem: GalleryItem = {
            id: crypto.randomUUID(),
            imageSrc: result,
            prompt: item.prompt,
            aspectRatio: item.aspectRatio,
            hairstyle: item.hairstyle, 
            nails: item.nails, 
            outfit: item.outfit, 
            skinComplexion: item.skinComplexion,
        };
        setGallery(prev => [newItem, ...prev.filter(i => i.id !== item.id)]);
    } catch (e) {
        console.error(`Failed to ${action} image.`, e);
        setError(`Failed to ${action}. Please try again.`);
    } finally {
        setItemIsLoading(prev => ({ ...prev, [item.id]: false }));
    }
  }, [originalImages, matchOriginalFace, matchSkinTone]);


  return (
    <div className="min-h-screen bg-black text-gray-200 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Header />
        <main className="mt-12 flex flex-col gap-8">
          <section className="bg-gray-950 border border-gray-800 rounded-2xl p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUploader 
                    onImageUpload={handleImageUpload} 
                    onImageRemove={handleImageRemove}
                    previews={originalImagePreviews} 
                    files={originalImages} 
                    maxImages={MAX_IMAGES}
                />
                <div className="flex flex-col gap-6">
                    <PromptInput
                        value={prompt}
                        onChange={setPrompt}
                        onMagicPrompt={handleMagicPrompt}
                        isMagicLoading={isMagicPromptLoading}
                    />
                    <GenerationSettings
                        numberOfImages={numberOfImages}
                        onNumberOfImagesChange={setNumberOfImages}
                        aspectRatio={aspectRatio}
                        onRatioChange={setAspectRatio}
                        matchOriginalFace={matchOriginalFace}
                        onMatchOriginalFaceChange={setMatchOriginalFace}
                        matchSkinTone={matchSkinTone}
                        onMatchSkinToneChange={setMatchSkinTone}
                    />
                    <AdvancedSettings 
                        hairstyle={hairstyle}
                        setHairstyle={setHairstyle}
                        nails={nails}
                        setNails={setNails}
                        outfit={outfit}
                        setOutfit={setOutfit}
                        skinComplexion={skinComplexion}
                        setSkinComplexion={setSkinComplexion}
                    />
                </div>
             </div>
             <div className="mt-8">
                <GenerateButton
                    onClick={handleGenerate}
                    isLoading={isLoading}
                    isDisabled={originalImages.length === 0 || isMagicPromptLoading}
                    numberOfImages={numberOfImages}
                />
             </div>
             {error && <p className="text-red-400 text-center mt-4">{error}</p>}
          </section>

          {(isLoading || latestCreations.length > 0) && (
            <ResultDisplay
                title="Latest Creations"
                isLoading={isLoading}
                items={latestCreations}
                onAction={handleAction}
                itemIsLoading={itemIsLoading}
                placeholderCount={numberOfImages}
            />
          )}

          {gallery.length > 0 && (
            <ResultDisplay
                title="Studio Gallery"
                items={gallery}
                onAction={handleAction}
                itemIsLoading={itemIsLoading}
            />
          )}

        </main>
        <footer className="mt-16 mb-8 text-center text-gray-500 text-sm font-medium">
          <p>&copy; 2025 Siderra Davis ( @Low.Ticket Millionaire )</p>
          <p className="mt-1">All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;