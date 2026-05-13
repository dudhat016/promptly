import React, { useState, useCallback, useEffect } from 'react';
import { generateImage } from './services/geminiService';

// --- Type Definitions ---
interface IconProps {
    className?: string;
}

// --- Constants ---
const STYLES_BASE = [
  { id: 'Cinematic Portrait', label: 'Portrait' },
  { id: 'Fashion Editorial', label: 'Fashion' },
  { id: 'Luxe Interior', label: 'Interior' },
  { id: 'Luxury Product', label: 'Product' },
  { id: 'Cyberpunk Noir', label: 'Cyberpunk' },
];
const STYLES = [...STYLES_BASE, ...STYLES_BASE.map(s => ({...s, id: `${s.id} v2`}))];


const FRAMING_OPTIONS_BASE = [
    { id: 'Headshot', label: 'Headshot' },
    { id: 'Upper Body', label: 'Upper Body' },
    { id: 'Mid Body', label: 'Mid Body' },
    { id: 'Full Body', label: 'Full Body' },
];
const FRAMING_OPTIONS = [...FRAMING_OPTIONS_BASE, ...FRAMING_OPTIONS_BASE.map(o => ({...o, id: `${o.id} v2`}))];


const SEASONS_BASE = [
    { id: 'None', label: 'None' },
    { id: 'Winter', label: 'Winter' },
    { id: 'Summer', label: 'Summer' },
    { id: 'Spring', label: 'Spring' },
    { id: 'Fall', label: 'Fall' },
];
const SEASONS = SEASONS_BASE;

const BACKGROUNDS_BASE = [
    { id: 'Studio', label: 'Studio' },
    { id: 'Outdoor', label: 'Outdoor' },
    { id: 'Abstract', label: 'Abstract' },
];
const BACKGROUNDS = [...BACKGROUNDS_BASE, ...BACKGROUNDS_BASE.map(b => ({...b, id: `${b.id} v2`}))];


const FILTERS_BASE = [
  { id: 'None', label: 'None' },
  { id: 'Vintage', label: 'Vintage' },
  { id: 'BlackAndWhite', label: 'B&W' },
  { id: 'Sepia', label: 'Sepia' },
  { id: 'HighContrast', label: 'Contrast' },
  { id: 'Warm', label: 'Warm' },
  { id: 'SilkyEditorial', label: 'Silky' },
];
const FILTERS = [...FILTERS_BASE, ...FILTERS_BASE.map(f => ({...f, id: `${f.id} v2`}))];


// --- Helper Functions ---
const getFilterStyle = (filterId: string): string => {
    const baseFilterId = filterId.replace(/ v2$/, '');
    switch (baseFilterId) {
        case 'Vintage':
            return 'sepia(0.6) contrast(1.1) brightness(0.9) saturate(1.2)';
        case 'BlackAndWhite':
            return 'grayscale(100%)';
        case 'Sepia':
            return 'sepia(100%)';
        case 'HighContrast':
            return 'contrast(150%)';
        case 'Warm':
            return 'sepia(0.4) saturate(1.2) brightness(1.05)';
        case 'SilkyEditorial':
            return 'contrast(1.15) saturate(1.1) brightness(1.05)';
        case 'None':
        default:
            return 'none';
    }
};

// --- SVG Icon Components ---
const WandIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104l-1.28 1.28a3.75 3.75 0 00-1.233 3.038v.015c.38.38.74.78.9 1.22l.338 1.014a1.5 1.5 0 01-2.42 1.636l-1.015-.338a1.5 1.5 0 01-1.22-.9c-.44-.16-.84-.52-1.22-.9v-.015a3.75 3.75 0 00-3.038 1.233l-1.28 1.28c-1.464 1.464-.945 4.12 1.144 6.209a13.465 13.465 0 006.21 1.144c2.088.49 4.744-.02 6.208-1.144l1.28-1.28a3.75 3.75 0 001.233-3.038v-.015c-.38-.38-.74-.78-.9-1.22l-.338-1.014a1.5 1.5 0 012.42-1.636l1.015.338a1.5 1.5 0 011.22.9c.44.16.84.52 1.22.9v.015a3.75 3.75 0 003.038-1.233l1.28-1.28c2.088-2.088 1.635-4.745-1.144-6.209a13.465 13.465 0 00-6.21-1.144c-2.088-.49-4.744.02-6.208 1.144z" />
    </svg>
);

const SparklesIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM18 15.75l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 20l-1.035.259a3.375 3.375 0 00-2.456 2.456L18 23.25l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 20l1.036-.259a3.375 3.375 0 002.455-2.456L18 15.75z" />
    </svg>
);

const Spinner: React.FC<IconProps> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const DownloadIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const PlusCircleIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrashIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const ChevronLeftIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ChevronRightIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const PhotoIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);


// --- UI Components ---
const Header: React.FC = () => (
    <header className="text-center p-6 border-b border-gray-700/50">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-fuchsia to-brand-purple">
            Luxe Ai Dolls
        </h1>
        <p className="mt-2 text-lg text-gray-400">
            Your personal AI stylist for creating your dream doll.
        </p>
    </header>
);

const Footer: React.FC = () => (
    <footer className="w-full text-center py-6 mt-8 border-t border-gray-800/50">
        <p className="text-gray-500 text-sm">
            © 2025 Siderra Davis ( @Low.Ticket Millionaire )
        </p>
        <p className="text-gray-600 text-xs mt-1">
            All Rights Reserved.
        </p>
    </footer>
);

interface StyleSelectorProps<T> {
  options: { id: T; label: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
  title: string;
  disabled?: boolean;
}

const StyleSelector = <T extends string>({ options, selectedValue, onSelect, title, disabled = false }: StyleSelectorProps<T>) => (
  <div className={disabled ? 'opacity-50' : ''}>
    <h2 className="text-xl font-semibold mb-3 text-gray-200">{title}</h2>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option.id)}
          disabled={disabled}
          className={`py-2 px-3 text-center rounded-lg transition-all duration-300 text-sm font-medium border
            ${selectedValue === option.id
              ? 'bg-brand-purple text-white border-purple-400'
              : `bg-gray-700/50 text-gray-300 border-gray-600 ${!disabled && 'hover:bg-gray-700 hover:border-gray-500'}`
            }
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

interface ReferencePhotoUploaderProps {
    photo: File | null;
    preview: string | null;
    onChange: (file: File) => void;
    onRemove: () => void;
    disabled?: boolean;
}

const ReferencePhotoUploader: React.FC<ReferencePhotoUploaderProps> = ({ preview, onChange, onRemove, disabled }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onChange(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) {
            onChange(file);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-200">6. Add a Reference Photo (Optional)</h2>
            <div
                className={`relative group aspect-video rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center transition-colors duration-300
                    ${!disabled && 'hover:border-brand-fuchsia'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !disabled && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    disabled={disabled}
                />
                {preview ? (
                    <>
                        <img src={preview} alt="Reference preview" className="w-full h-full object-contain rounded-lg" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors duration-300"
                            aria-label="Remove reference photo"
                            disabled={disabled}
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <div className="text-center text-gray-400">
                        <PhotoIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>Drop an image or click to upload</p>
                        <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
                    </div>
                )}
            </div>
        </div>
    );
};


interface GalleryProps {
    images: string[];
    onDelete: (index: number) => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onDelete }) => {
    if (images.length === 0) return null;

    return (
        <div className="mt-12 animate-fade-in">
            <div className="h-px bg-gray-700/50 mb-12"></div>
            <h2 className="text-3xl font-bold text-center mb-6">My Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((imageSrc, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-700/50">
                        <img src={imageSrc} alt={`Gallery image ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                            <button
                                onClick={() => onDelete(index)}
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 bg-red-600/80 rounded-full hover:bg-red-500"
                                aria-label="Delete image"
                            >
                                <TrashIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface GenerationParams {
  prompt: string;
  style: string;
  season: string;
  framing: string;
  background: string;
  referencePhoto: File | null;
}

// --- Main App Component ---
export default function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [currentGeneratedIndex, setCurrentGeneratedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<string>('Cinematic Portrait');
  const [framing, setFraming] = useState<string>('Upper Body');
  const [season, setSeason] = useState<string>('None');
  const [background, setBackground] = useState<string>('Studio');
  const [selectedFilter, setSelectedFilter] = useState<string>('None');
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [lastGenerationParams, setLastGenerationParams] = useState<GenerationParams | null>(null);
  const [referencePhoto, setReferencePhoto] = useState<File | null>(null);
  const [referencePhotoPreview, setReferencePhotoPreview] = useState<string | null>(null);


  // Load gallery from localStorage on mount
  useEffect(() => {
    try {
        const savedImages = localStorage.getItem('luxe-ai-gallery');
        if (savedImages) {
            setGalleryImages(JSON.parse(savedImages));
        }
    } catch (error) {
        console.error("Failed to load images from localStorage", error);
    }
  }, []);

  // Save gallery to localStorage on change
  useEffect(() => {
    try {
        localStorage.setItem('luxe-ai-gallery', JSON.stringify(galleryImages));
    } catch (error) {
        console.error("Failed to save images to localStorage", error);
    }
  }, [galleryImages]);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } else {
          console.warn('aistudio API not found. Assuming key is available.');
          setIsKeySelected(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setIsKeySelected(false);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    try {
        await window.aistudio.openSelectKey();
        setIsKeySelected(true);
        setError(null);
    } catch (e) {
        console.error("Error opening select key dialog:", e);
    }
  };

  const handleApiError = (err: unknown) => {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "UNKNOWN_API_ERROR";

      switch (errorMessage) {
        case 'INVALID_KEY':
        case 'API_KEY_MISSING':
          setError("Your API key is invalid or missing. Please select a valid, billed API key to continue.");
          setIsKeySelected(false);
          break;
        case 'QUOTA_EXCEEDED':
          setError("You've exceeded your API quota. Please check your Google AI project's billing status or try a different key.");
          setIsKeySelected(false);
          break;
        case 'SAFETY_BLOCK':
          setError("The request was blocked due to the content policy. Please modify your prompt and try again.");
          break;
        case 'NO_IMAGE_RETURNED':
          setError("The model did not return an image. This can happen with very complex prompts. Please try simplifying your request.");
          break;
        case 'UNKNOWN_API_ERROR':
        default:
          setError("An unexpected error occurred while generating the image. Please try again or check the console for details.");
          break;
      }
  }
  
    const handleReferencePhotoChange = (file: File) => {
        setReferencePhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferencePhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveReferencePhoto = () => {
        setReferencePhoto(null);
        setReferencePhotoPreview(null);
    };


  const performGeneration = async (params: GenerationParams) => {
    if (!params.prompt.trim()) {
        setError('Please describe the image you want to create.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
        const { prompt, style, season, framing, background, referencePhoto } = params;
        const results = await generateImage(prompt, style, season, framing, background, referencePhoto);

        if (results.length > 0) {
            const imageUrls = results.map(r => `data:${r.mimeType};base64,${r.image}`);
            setGeneratedImages(imageUrls);
            setCurrentGeneratedIndex(0);
            setSelectedFilter('None');
            setLastGenerationParams(params);
        } else {
            setError("The model did not return any images. This might be due to a safety policy violation. Please try a different prompt.");
        }
    } catch (err) {
        handleApiError(err);
    } finally {
        setIsLoading(false);
    }
  };


  const handleGenerateClick = () => {
    performGeneration({ prompt, style, season, framing, background, referencePhoto });
  };
  
  const handleGenerateVariationsClick = () => {
    if (!lastGenerationParams) {
        setError('Please generate an image first before creating variations.');
        return;
    }
    performGeneration(lastGenerationParams);
  };

  const getCurrentImageWithFilter = (callback: (dataUrl: string) => void) => {
    const currentImage = generatedImages[currentGeneratedIndex];
    if (!currentImage) return;

    const filterStyle = getFilterStyle(selectedFilter);

    if (selectedFilter === 'None' || filterStyle === 'none') {
        callback(currentImage);
    } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.filter = filterStyle;
                ctx.drawImage(img, 0, 0);
                callback(canvas.toDataURL('image/png'));
            }
        };
        img.src = currentImage;
    }
  };

  const handleAddToGalleryClick = () => {
    getCurrentImageWithFilter(imageWithFilter => {
        setGalleryImages(prev => [imageWithFilter, ...prev]);
    });
  };

  const handleDeleteFromGallery = (indexToDelete: number) => {
    setGalleryImages(prev => prev.filter((_, index) => index !== indexToDelete));
  };
  
  const handleDownloadClick = () => {
    getCurrentImageWithFilter(imageWithFilter => {
      const link = document.createElement('a');
      link.href = imageWithFilter;
      const fileExtension = imageWithFilter.startsWith('data:image/png') ? 'png' : 'jpeg';
      link.download = `luxe-ai-studio-image-${Date.now()}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
        {!isKeySelected && !isCheckingKey && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center animate-fade-in p-4">
              <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md w-full border border-gray-700">
                  <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
                  <p className="text-gray-400 mb-6">
                      To generate images, this app requires a Google AI API key with billing enabled. Please select your key to continue.
                  </p>
                  <button
                      onClick={handleSelectKey}
                      className="w-full py-3 px-6 bg-gradient-to-r from-brand-fuchsia to-brand-purple text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity duration-300"
                  >
                      Select API Key
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                      For more information, visit{' '}
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-fuchsia">
                          Google AI billing documentation
                      </a>.
                  </p>
              </div>
          </div>
        )}
      <Header />
      <main className={`container mx-auto p-4 md:p-8 transition-filter duration-300 flex-grow ${!isKeySelected ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="flex flex-col space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
             <StyleSelector 
                title="1. Choose a Style"
                options={STYLES}
                selectedValue={style}
                onSelect={setStyle}
            />
             <StyleSelector 
                title="2. Select Framing"
                options={FRAMING_OPTIONS}
                selectedValue={framing}
                onSelect={setFraming}
            />
            
            <StyleSelector 
                title="3. Choose a Season (Optional)"
                options={SEASONS}
                selectedValue={season}
                onSelect={setSeason}
            />

            <StyleSelector 
                title="4. Select Background"
                options={BACKGROUNDS}
                selectedValue={background}
                onSelect={setBackground}
            />
            
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-200">5. Describe Your Vision</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A confident woman in a black dress, sitting in a modern armchair..."
                className="w-full h-36 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-fuchsia focus:border-brand-fuchsia transition-all duration-300 resize-none"
              />
            </div>
            
            <ReferencePhotoUploader
                photo={referencePhoto}
                preview={referencePhotoPreview}
                onChange={handleReferencePhotoChange}
                onRemove={handleRemoveReferencePhoto}
                disabled={isLoading}
            />

            <button
              onClick={handleGenerateClick}
              disabled={isLoading || !prompt.trim()}
              className="w-full flex items-center justify-center py-3 px-6 bg-gradient-to-r from-brand-fuchsia to-brand-purple text-white font-bold rounded-lg text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-300"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-5 h-5 mr-3" />
                  Generating...
                </>
              ) : (
                <>
                  <WandIcon className="w-5 h-5 mr-3" />
                  Generate Image
                </>
              )}
            </button>
            {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">{error}</div>}
          </div>

          {/* Results Column */}
          <div className="flex flex-col items-center justify-start h-full">
            <div className="w-full max-w-full aspect-square bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden">
                {isLoading && (
                     <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/80">
                         <Spinner className="w-10 h-10 text-brand-purple" />
                         <p className="mt-4 text-lg">Conjuring your vision...</p>
                     </div>
                )}
                {!isLoading && generatedImages.length > 0 && (
                    <>
                        <img
                            src={generatedImages[currentGeneratedIndex]}
                            alt={`Generated image ${currentGeneratedIndex + 1}`}
                            className="w-full h-full object-contain rounded-lg animate-fade-in"
                            style={{ filter: getFilterStyle(selectedFilter) }}
                        />
                        {generatedImages.length > 1 && (
                            <>
                                <button onClick={() => setCurrentGeneratedIndex(i => (i - 1 + generatedImages.length) % generatedImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors">
                                    <ChevronLeftIcon className="w-6 h-6 text-white" />
                                </button>
                                <button onClick={() => setCurrentGeneratedIndex(i => (i + 1) % generatedImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors">
                                    <ChevronRightIcon className="w-6 h-6 text-white" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-sm">
                                    {currentGeneratedIndex + 1} / {generatedImages.length}
                                </div>
                            </>
                        )}
                    </>
                )}
                {!isLoading && generatedImages.length === 0 && (
                    <span className="text-gray-500 p-4 text-center">Your generated image will appear here</span>
                )}
            </div>
             {generatedImages.length > 0 && !isLoading && (
                <div className="mt-4 w-full flex flex-col items-center gap-4 animate-fade-in">
                     <div>
                        <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Apply a Filter</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {FILTERS.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`py-2 px-4 text-center rounded-lg transition-all duration-300 text-sm font-medium border
                                        ${selectedFilter === filter.id
                                            ? 'bg-brand-purple text-white border-purple-400'
                                            : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                                        }
                                    `}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={handleGenerateVariationsClick}
                            disabled={isLoading}
                            className="flex items-center justify-center py-2 px-6 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Variations
                        </button>
                        <button
                            onClick={handleAddToGalleryClick}
                            className="flex items-center justify-center py-2 px-6 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors duration-300"
                        >
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Add to Gallery
                        </button>
                        <button
                            onClick={handleDownloadClick}
                            className="flex items-center justify-center py-2 px-6 bg-brand-purple text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-300"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Download
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
        <Gallery images={galleryImages} onDelete={handleDeleteFromGallery} />
      </main>
      <Footer />
    </div>
  );
}