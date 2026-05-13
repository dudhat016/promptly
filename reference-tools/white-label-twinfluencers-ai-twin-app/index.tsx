import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

// --- HELPER FUNCTIONS ---
const fileToGenerativePart = async (file: File) => {
  // FIX: Explicitly type the Promise to resolve with a string. This resolves the type error where 'unknown' was not assignable to the 'string' type expected by the API for inline image data.
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to read file as a base64 string.'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// --- STYLES ---
const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    
    :root {
      --background-color: #121212;
      --surface-color: #1e1e1e;
      --primary-color: #bb86fc;
      --primary-variant-color: #3700b3;
      --secondary-color: #03dac6;
      --text-color: #e0e0e0;
      --text-color-secondary: #b0b0b0;
      --error-color: #cf6679;
      --border-radius: 8px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Poppins', sans-serif;
      background-color: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
    }

    header {
      text-align: center;
      margin-bottom: 2rem;
    }

    header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    header p {
      font-size: 1.1rem;
      color: var(--text-color-secondary);
    }

    .tabs {
      margin-top: 1.5rem;
      display: flex;
      justify-content: center;
      gap: 1rem;
      border-bottom: 1px solid var(--surface-color);
    }

    .tabs button {
      padding: 0.5rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      color: var(--text-color-secondary);
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;
    }

    .tabs button.active, .tabs button:hover {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }
    
    .view-container {
      display: grid;
      gap: 2rem;
      align-items: flex-start;
    }
    
    .generate-view {
       grid-template-columns: 450px 1fr;
    }
    
    .edit-view, .gallery-view {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .controls-panel, .output-panel, .edit-controls, .edit-output-wrapper {
      background-color: var(--surface-color);
      padding: 1.5rem;
      border-radius: var(--border-radius);
      position: relative;
    }
    
    .controls-panel h3 {
        margin-bottom: 1rem;
        color: var(--primary-color);
        margin-top: 1.5rem;
        border-top: 1px solid #333;
        padding-top: 1.5rem;
    }

    .output-panel, .edit-output-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 600px;
      flex-direction: column;
    }

    .placeholder-text {
        color: var(--text-color-secondary);
        text-align: center;
    }

    .output-image-grid, .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      width: 100%;
    }
    
    .output-image-container, .gallery-image-container {
        position: relative;
    }

    .output-image, .preview-image, .gallery-image {
      width: 100%;
      height: auto;
      object-fit: contain;
      border-radius: var(--border-radius);
    }
    
    .output-image-container:hover .output-actions-single, .gallery-image-container:hover .gallery-actions {
        opacity: 1;
    }
    
    .output-actions-single, .gallery-actions {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.5rem;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .gallery-actions button {
        background-color: var(--primary-variant-color) !important;
    }
     .gallery-actions button.delete {
        background-color: var(--error-color) !important;
    }


    .control-group {
      margin-bottom: 1.5rem;
    }
    
    .control-group.slider-group {
        display: flex;
        flex-direction: column;
    }
    
    .control-group.toggle-group {
        display: flex;
        align-items: center;
        gap: 1rem;
    }


    .control-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--text-color-secondary);
    }
    
    .grid-controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .control-group input[type="text"], .control-group select, .control-group textarea {
      width: 100%;
      padding: 0.75rem;
      background-color: var(--background-color);
      border: 1px solid #333;
      border-radius: var(--border-radius);
      color: var(--text-color);
      font-size: 1rem;
    }
    
    .control-group textarea {
        resize: vertical;
        min-height: 80px;
    }

    .preset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .preset-buttons button, .output-actions button, .output-actions-single button, .gallery-actions button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      background-color: var(--primary-variant-color);
      color: var(--text-color);
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .preset-buttons button:hover, .output-actions button:hover, .output-actions-single button:hover, .gallery-actions button:hover {
      background-color: #4a148c;
    }

    .action-button {
      width: 100%;
      padding: 1rem;
      font-size: 1.2rem;
      font-weight: 700;
      background-color: var(--primary-color);
      color: #000;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background-color 0.2s ease;
      margin-top: 1rem;
    }
    
    .action-button:disabled {
        background-color: #555;
        cursor: not-allowed;
    }

    .action-button:not(:disabled):hover {
      background-color: var(--secondary-color);
    }

    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: var(--border-radius);
      z-index: 1000;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 4px solid var(--primary-color);
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--error-color);
      color: #fff;
      padding: 1rem 2rem;
      border-radius: var(--border-radius);
      z-index: 1001;
      font-weight: 600;
    }
    
    .image-upload-area {
      width: 100%;
      border: 2px dashed var(--text-color-secondary);
      border-radius: var(--border-radius);
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      margin-bottom: 1rem;
      transition: border-color 0.3s;
    }
    .image-upload-area:hover {
        border-color: var(--primary-color);
    }
    
    .preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    .preview-thumbnail-container {
        position: relative;
    }
    
    .preview-thumbnail {
        width: 100%;
        height: auto;
        border-radius: 4px;
    }
    
    .remove-preview-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        cursor: pointer;
        font-weight: bold;
        line-height: 20px;
        text-align: center;
    }
    
    .edit-controls {
        width: 100%;
        max-width: 600px;
        margin-top: 1rem;
    }
    
    .edit-output-wrapper {
        margin-top: 1rem;
        width: 100%;
        max-width: 800px;
    }

    .output-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        width: 100%;
        justify-content: center;
    }
    
    .studio-section {
        background: var(--background-color);
        padding: 1rem;
        border-radius: var(--border-radius);
        margin-bottom: 1.5rem;
    }
    
    .makeup-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }
    
    .makeup-tabs button {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        background: var(--surface-color);
        color: var(--text-color-secondary);
        border: 1px solid #333;
        border-radius: var(--border-radius);
        cursor: pointer;
    }
    .makeup-tabs button.active {
        background: var(--primary-color);
        color: #000;
        font-weight: 600;
    }
    
    footer {
        text-align: center;
        margin-top: 3rem;
        padding: 1rem;
        color: var(--text-color-secondary);
        font-size: 0.9rem;
    }

    @media (max-width: 1200px) {
      .generate-view {
        grid-template-columns: 380px 1fr;
      }
    }
    @media (max-width: 900px) {
      .generate-view {
        grid-template-columns: 1fr;
      }
    }
     @media (max-width: 600px) {
      .grid-controls {
        grid-template-columns: 1fr;
      }
      .output-actions {
        flex-direction: column;
        align-items: center;
      }
    }
  `}</style>
);

const PRESETS = {
  luxury: 'A hyperrealistic, ultra-detailed photo of a youthful, glamorous influencer at a luxury gala, wearing a stunning Haute Couture gown, with flawless skin and full glam makeup, 4k, soft cinematic lighting',
  vintage: 'A classic black and white Hollywood movie star portrait of a youthful influencer, 1950s style, elegant, flawless skin, natural expression, wearing a glamorous evening gown, with classic red lips and winged eyeliner',
  fantasy: 'A photo of an ethereal fantasy elf influencer in an enchanted forest, youthful face, flawless skin, natural expression, wearing flowing robes made of leaves and moonlight, with subtle, shimmering makeup, hyperrealistic details',
};

const MAKEUP_PRESETS = [
    "Default", "Soft Glam", "Clean Girl Look", "Full Glam / Red Carpet", "Natural No-Makeup Look",
    "Matte Finish", "Glossy Glow", "Bronze Goddess", "Dewy Hydration", "Editorial / High-Fashion",
    "Runway Couture", "E-Girl Aesthetic", "Y2K Revival Glam", "Vintage 90s Glam", "Barbie Pink Look",
    "Neutral Nude Tones", "Bold Cat Eye & Liner", "Shimmery Gold Glam", "Cut Crease Eyeshadow",
    "Smokey Eye Classic", "Sunset Blend Eyes", "Festival Glitter Glam", "Fantasy Makeup",
    "Holiday Glam", "Winter Frost Look", "Summer Glow", "Bridal Elegance", "Date Night Glam",
    "Luxury Editorial Matte", "Artistic / Avant-Garde", "Monochrome Glam", "Retro Pin-Up",
    "Dark Glam / Gothic Edge", "Pop-Star Performance Look"
];

const HAIR_STYLE_PRESETS = [
    "Default", "Sleek Middle-Part Straight", "Voluminous Curls (3A-3C)", "Defined Coils (4A-4C)",
    "Afro Puff High Bun", "Classic Box Braids", "Knotless Waist-Length Braids", "Cornrows with Beads",
    "Faux Locs / Butterfly Locs", "Soft Blowout", "Hollywood Barrel Curls", "Long Beach Waves",
    "Short Pixie Cut", "Sleek Low Ponytail", "High Ponytail with Edge Design", "Half-Up Half-Down Glam",
    "Space Buns", "Top Knot Messy Bun", "Braided Crown Halo", "Retro Finger Waves",
    "90s Flip Bob", "Blunt Bob with Bangs", "Side-Swept Bangs", "Wet Look Glam", "Long Locs with Accessories",
    "Ponytail with Braided Base", "Y2K Two-Ponytail Look", "70s Feathered Layers", "80s Crimped Texture",
    "2000s Side Part Glam", "Curly Updo", "Protective Head Wrap or Scarf", "Platinum Blonde Straight",
    "Ombre Color Blend"
];


// --- GALLERY VIEW ---
const GalleryView = ({ images, setGalleryImages }: { images: string[], setGalleryImages: (images: string[]) => void }) => {
    const handleDownload = (imageUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `twinfluencer_gallery_${index}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = (indexToDelete: number) => {
        const updatedImages = images.filter((_, index) => index !== indexToDelete);
        setGalleryImages(updatedImages);
    };

    return (
        <div className="view-container gallery-view">
            {images.length === 0 ? (
                <div className="output-panel" style={{ width: '100%' }}>
                    <p className="placeholder-text">Your saved images will appear here.</p>
                </div>
            ) : (
                <div className="gallery-grid">
                    {images.map((src, index) => (
                        <div key={index} className="gallery-image-container">
                            <img src={src} alt={`Gallery item ${index}`} className="gallery-image" />
                            <div className="gallery-actions">
                                <button onClick={() => handleDownload(src, index)}>Download</button>
                                <button className="delete" onClick={() => handleDelete(index)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- GENERATE TWIN COMPONENT ---
const GenerateTwinView = ({ ai, setGlobalError, setIsGenerating, onImageGenerated }: { ai: GoogleGenAI, setGlobalError: (error: string | null) => void, setIsGenerating: (isGenerating: boolean) => void, onImageGenerated: (images: string[]) => void }) => {
    const [promptConfig, setPromptConfig] = useState({
        basePrompt: 'A photorealistic portrait of a glamorous, youthful influencer with flawless, natural, detailed skin texture and a natural expression',
        ethnicity: 'Caucasian', eyeColor: 'None', skinTexture: 'Flawless (Default)', bodyShape: 'Keep Original', bustSize: 'Medium',
        expression: 'a gentle smile', outfit: 'a designer dress', style: 'Haute Couture',
        accessories: '', season: 'None', aspectRatio: '1:1', backgroundType: 'None', backgroundColor: ''
    });
    
     const [hairConfig, setHairConfig] = useState({
        style: 'Default', length: 'Shoulder-Length', color: '', accessories: '',
    });
    
    const [makeupConfig, setMakeupConfig] = useState({
        preset: 'Default', foundationShade: 50, foundationFinish: 'Glossy', undertone: 'Neutral',
        lashLength: 30, lipIntensity: 50, lipFinish: 'Glossy', blushIntensity: 40, highlightIntensity: 60,
    });
    
    const [activeMakeupTab, setActiveMakeupTab] = useState('Presets');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [numberOfImages, setNumberOfImages] = useState(1);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPromptConfig(prev => ({ ...prev, [name]: value }));
  };
  
   const handleHairConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setHairConfig(prev => ({ ...prev, [name]: value }));
  };
  
   const handleMakeupConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMakeupConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files: File[] = Array.from(e.target.files as FileList).slice(0, 8);
        if (files.length > 0) {
            setReferenceFiles(files);
            const urls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(urls);
        }
    }
  };
  
  const removeReferenceImage = (indexToRemove: number) => {
    setReferenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `twinfluencer_${Date.now()}_${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    setPromptConfig(prev => ({
        ...prev,
        basePrompt: PRESETS[presetName],
        outfit: '', style: '',
    }));
  };
  
  const buildMakeupPrompt = () => {
    if (makeupConfig.preset !== 'Default') {
        return `with a ${makeupConfig.preset.toLowerCase()} makeup style`;
    }
    let makeupDetails = 'with a custom makeup look featuring';
    const shadeDesc = makeupConfig.foundationShade < 33 ? 'light' : makeupConfig.foundationShade < 66 ? 'medium' : 'deep';
    makeupDetails += ` a ${shadeDesc}-shade foundation with a ${makeupConfig.undertone.toLowerCase()} undertone and a ${makeupConfig.foundationFinish.toLowerCase()} finish`;
    if (makeupConfig.blushIntensity > 10) makeupDetails += `, ${makeupConfig.blushIntensity > 60 ? 'strong' : 'subtle'} blush`;
    if (makeupConfig.highlightIntensity > 10) makeupDetails += `, and a ${makeupConfig.highlightIntensity > 60 ? 'luminous' : 'gentle'} highlight`;
    const lashDesc = makeupConfig.lashLength < 33 ? 'natural' : makeupConfig.lashLength < 66 ? 'wispy and long' : 'dramatic and voluminous';
    makeupDetails += `, ${lashDesc} lashes`;
    const lipIntensityDesc = makeupConfig.lipIntensity < 33 ? 'a subtle hint of color on the lips' : makeupConfig.lipIntensity < 66 ? 'a medium-pigment lipstick' : 'a bold, high-pigment lip color';
    makeupDetails += `, and ${lipIntensityDesc} with a ${makeupConfig.lipFinish.toLowerCase()} finish`;
    return makeupDetails;
  };
  
   const buildHairPrompt = () => {
        if (hairConfig.style === 'Default' && !hairConfig.color && !hairConfig.accessories) return '';
        
        let hairDetails = ' with hair that is styled as';
        
        if (hairConfig.style !== 'Default') {
            hairDetails += ` ${hairConfig.style.toLowerCase()}`;
        }
        
        if (hairConfig.length !== 'Shoulder-Length') {
             hairDetails += `, ${hairConfig.length.toLowerCase()}`;
        }
        
        if (hairConfig.color.trim() !== '') {
            hairDetails += `, colored ${hairConfig.color.trim()}`;
        }

        if (hairConfig.accessories.trim() !== '') {
            hairDetails += `, and adorned with ${hairConfig.accessories.trim()}`;
        }
        
        return hairDetails;
    };
  
  const getBodyShapePrompt = (shape: string, bust: string) => {
      let prompt = '';
      switch(shape) {
          case 'Curvy': prompt = 'with a gorgeous, very curvy hourglass figure'; break;
          case 'Thick': prompt = 'with a thick, curvy physique, strong thighs'; break;
          case 'Short and Thick': prompt = 'with a short, thick, and curvy build, strong legs'; break;
          case 'Plus Size': case 'More to Love': prompt = 'with a beautiful plus-size figure, soft curves'; break;
          case 'Petite': prompt = 'with a petite, slender, and delicate frame'; break;
          case 'Skinny': prompt = 'with a very slim, slender, athletic-toned physique'; break;
          default: return '';
      }
      
      switch(bust) {
          case 'Small': prompt += ', a small bust,'; break;
          case 'Medium': prompt += ', a medium-sized bust,'; break;
          case 'Large': prompt += ', a full, large bust,'; break;
          case 'DD+': prompt += ', a very large, DD+ bust,'; break;
      }

      if (shape === 'Curvy' || shape === 'Thick' || shape === 'Short and Thick') {
          prompt += ' and a prominent, rounded backside';
      } else if (shape === 'Plus Size' || shape === 'More to Love') {
          prompt += ' and a confident presence'
      }
      
      return prompt;
  }

  const buildBackgroundPrompt = () => {
    const { backgroundType, backgroundColor } = promptConfig;
    if (backgroundType === 'None') return '';
    
    switch(backgroundType) {
        case 'Studio (Plain)':
            return ', in a professional photography studio with a clean, plain backdrop';
        case 'Outdoor City':
            return ', in a dynamic outdoor city scene, like a bustling street or in front of modern architecture';
        case 'Nature Landscape':
            return ', in a serene nature landscape, like a forest, beach, or mountains';
        case 'Abstract Gradient':
            return ', against a soft, abstract gradient background';
        case 'Luxury Penthouse':
            return ', inside a luxurious, modern penthouse apartment with floor-to-ceiling windows showing a city skyline at night';
        case 'Mansion Interior':
            return ', inside a lavish mansion interior, with classic, ornate decor and rich textures';
        case 'Hotel Lobby':
            return ', in the grand, opulent lobby of a five-star luxury hotel';
        case 'Marble Staircase':
            return ', posing elegantly on a sweeping, grand marble staircase';
        case 'Elevator Shoot':
            return ', in a stylish, modern elevator with reflective surfaces and moody lighting, creating a high-fashion editorial feel';
        case 'Solid Color':
            if (backgroundColor.trim() !== '') {
                return `, against a solid ${backgroundColor.trim()} background`;
            }
            return ', against a solid, neutral-colored background';
        default:
            return '';
    }
};


  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGlobalError(null);
    setGeneratedImages([]);

    let textPrompt = referenceFiles.length > 0 ? 
      `CRITICAL INSTRUCTION: PERFECT 1:1 FACE REPLICATION. The absolute top priority is to generate a new, hyperrealistic image that is an IDENTICAL TWIN of the person in the reference photo(s). You MUST perfectly replicate the person's exact facial identity, features, structure, bone structure, eye shape, nose, and mouth. Do not interpret or stylize the face. The generated person MUST be instantly recognizable as the same individual and pass a facial recognition comparison. AVOID changing any facial features. The only elements to be changed are the context (hair, makeup, clothing, setting) as described in the following prompt. Start with that perfect face, and then apply these additional characteristics:` :
      promptConfig.basePrompt;
      
    const addDetail = (detail: string, prefix = ', ') => {
        if (detail && detail !== 'None' && detail !== 'Default' && detail.trim() !== '') {
            textPrompt += `${prefix}${detail}`;
        }
    };
    
    const addSkinTextureDetail = () => {
        switch(promptConfig.skinTexture) {
            case 'Hyper-Realistic (Natural Pores)':
                textPrompt += ', with hyper-realistic, ultra-detailed skin showing natural pores and micro-textures';
                break;
            case 'Silk Smooth':
                textPrompt += ', with incredibly smooth, silk-like skin';
                break;
            case 'Matte Finish':
                textPrompt += ', with a flawless matte finish on the skin';
                break;
            case 'Dewy Glow':
                textPrompt += ', with a healthy, dewy glow on the skin';
                break;
            case 'Subtle Freckles':
                textPrompt += ', with delicate, subtle, natural-looking freckles across the nose and cheeks';
                break;
            case 'Sun-Kissed Tanned':
                textPrompt += ', with a beautiful, sun-kissed tanned skin tone';
                break;
            case 'Luminous Sheen':
                textPrompt += ', with a luminous, radiant sheen on the skin';
                break;
            case 'Cat / Feline Pattern':
                textPrompt += ', with beautiful, subtle feline-patterned skin';
                break;
            case 'Flawless (Default)':
            default:
                // No additional prompt needed, the base prompt covers this.
                break;
        }
    }


    addDetail(`a person of ${promptConfig.ethnicity} ethnicity`);
    addDetail(getBodyShapePrompt(promptConfig.bodyShape, promptConfig.bustSize));
    if(promptConfig.eyeColor !== 'None') addDetail(`with ${promptConfig.eyeColor} eyes`);
    addDetail(buildHairPrompt());
    addSkinTextureDetail();
    addDetail(`with ${promptConfig.expression}`);
    addDetail(`wearing ${promptConfig.outfit}`);
    if (promptConfig.season !== 'None') addDetail(`which is a piece of ${promptConfig.season.toLowerCase()} attire`);
    addDetail(`in a ${promptConfig.style} style`);
    if (promptConfig.accessories) addDetail(`accessorized with ${promptConfig.accessories}`);
    addDetail(buildMakeupPrompt());
    addDetail(buildBackgroundPrompt());


    if (referenceFiles.length === 0) {
        textPrompt += `, 4k, hyperrealistic photography, soft natural lighting, ultra-detailed skin`;
    }

    try {
        let finalImages: string[] = [];
        if (referenceFiles.length > 0) {
            const imageParts = await Promise.all(referenceFiles.map(file => fileToGenerativePart(file)));
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, { text: textPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const imageResponsePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imageResponsePart?.inlineData?.data) {
                 finalImages = [`data:image/png;base64,${imageResponsePart.inlineData.data}`];
            } else { throw new Error("Could not get an image from the response."); }
        } else {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001', prompt: textPrompt,
                config: { numberOfImages, aspectRatio: promptConfig.aspectRatio },
            });
            finalImages = response.generatedImages?.map(
                img => img?.image?.imageBytes ? `data:image/png;base64,${img.image.imageBytes}` : null
            ).filter((item): item is string => item !== null) ?? [];
        }
        setGeneratedImages(finalImages);
        onImageGenerated(finalImages);

    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || 'An error occurred during image generation.');
    } finally {
      setIsGenerating(false);
    }
  }, [ai, promptConfig, hairConfig, makeupConfig, referenceFiles, numberOfImages, setIsGenerating, setGlobalError, onImageGenerated]);

  return (
    <div className="view-container generate-view">
      <div className="controls-panel">
        <input type="file" id="ref-image-upload" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
        <label htmlFor="ref-image-upload" className="image-upload-area">
            <p>Click to upload 1-8 reference photos</p>
            <span style={{fontSize: '0.8rem', color: 'var(--text-color-secondary)'}}>(Optional)</span>
        </label>
        {previewUrls.length > 0 && (
            <div className="preview-grid">
                {previewUrls.map((url, index) => (
                    <div key={index} className="preview-thumbnail-container">
                        <img src={url} alt={`ref ${index}`} className="preview-thumbnail" />
                        <button className="remove-preview-btn" onClick={() => removeReferenceImage(index)}>×</button>
                    </div>
                ))}
            </div>
        )}
      
        <div className="control-group">
          <label htmlFor="basePrompt">Base Prompt {referenceFiles.length > 0 && '(Additional Instructions)'}</label>
          <textarea id="basePrompt" name="basePrompt" value={promptConfig.basePrompt} onChange={handleConfigChange}></textarea>
        </div>

        <div className="control-group">
          <label>Overall Style Presets</label>
          <div className="preset-buttons">
            <button onClick={() => applyPreset('luxury')}>Luxury</button>
            <button onClick={() => applyPreset('vintage')}>Vintage</button>
            <button onClick={() => applyPreset('fantasy')}>Fantasy</button>
          </div>
        </div>
        
        <h3>Appearance Details</h3>
        <div className="grid-controls">
            <div className="control-group">
              <label htmlFor="ethnicity">Ethnicity</label>
              <select id="ethnicity" name="ethnicity" value={promptConfig.ethnicity} onChange={handleConfigChange}>
                 <option value="African">African</option><option value="Asian">Asian</option>
                 <option value="Caucasian">Caucasian</option><option value="Hispanic/Latin">Hispanic/Latin</option>
                 <option value="Middle Eastern">Middle Eastern</option><option value="Native American">Native American</option>
                 <option value="Pacific Islander">Pacific Islander</option>
              </select>
            </div>
             <div className="control-group">
              <label htmlFor="bodyShape">Body Shape</label>
              <select id="bodyShape" name="bodyShape" value={promptConfig.bodyShape} onChange={handleConfigChange}>
                 <option value="Keep Original">Keep Original</option><option value="Curvy">Curvy</option>
                 <option value="Thick">Thick</option><option value="Short and Thick">Short and Thick</option>
                 <option value="Plus Size">Plus Size</option><option value="More to Love">More to Love</option>
                 <option value="Petite">Petite</option><option value="Skinny">Skinny</option>
              </select>
            </div>
             <div className="control-group">
              <label htmlFor="bustSize">Bust Size</label>
              <select id="bustSize" name="bustSize" value={promptConfig.bustSize} onChange={handleConfigChange}>
                 <option value="Small">Small</option><option value="Medium">Medium</option>
                 <option value="Large">Large</option><option value="DD+">DD+</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="eyeColor">Eye Color</label>
              <select id="eyeColor" name="eyeColor" value={promptConfig.eyeColor} onChange={handleConfigChange}>
                <option value="None">None</option><option value="Brown">Brown</option><option value="Blue">Blue</option>
                <option value="Green">Green</option><option value="Hazel">Hazel</option><option value="Amber">Amber</option>
                <option value="Grey">Grey</option><option value="Black">Black</option>
              </select>
            </div>
             <div className="control-group">
              <label htmlFor="skinTexture">Skin Texture</label>
              <select id="skinTexture" name="skinTexture" value={promptConfig.skinTexture} onChange={handleConfigChange}>
                <option value="Flawless (Default)">Flawless (Default)</option>
                <option value="Hyper-Realistic (Natural Pores)">Hyper-Realistic (Natural Pores)</option>
                <option value="Silk Smooth">Silk Smooth</option>
                <option value="Matte Finish">Matte Finish</option>
                <option value="Dewy Glow">Dewy Glow</option>
                <option value="Subtle Freckles">Subtle Freckles</option>
                <option value="Sun-Kissed Tanned">Sun-Kissed Tanned</option>
                <option value="Luminous Sheen">Luminous Sheen</option>
                <option value="Cat / Feline Pattern">Cat / Feline Pattern</option>
              </select>
            </div>
             <div className="control-group">
              <label htmlFor="expression">Facial Expression</label>
              <select id="expression" name="expression" value={promptConfig.expression} onChange={handleConfigChange}>
                <option value="a gentle smile">Gentle Smile</option><option value="a natural laugh">Natural Laugh</option>
                <option value="a calm, serious look">Serious</option><option value="a playful wink">Winking</option>
                <option value="a pensive, thoughtful look">Pensive</option><option value="a joyful expression">Joyful</option>
              </select>
            </div>
        </div>
        
        <h3>Hair Studio</h3>
        <div className="studio-section">
             <div className="control-group">
                <label htmlFor="hairStyle">Hair Style</label>
                <select id="hairStyle" name="style" value={hairConfig.style} onChange={handleHairConfigChange}>
                    {HAIR_STYLE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
             <div className="grid-controls">
                <div className="control-group">
                    <label htmlFor="hairLength">Length</label>
                    <select id="hairLength" name="length" value={hairConfig.length} onChange={handleHairConfigChange}>
                        <option>Shoulder-Length</option><option>Short</option><option>Medium</option><option>Long</option><option>Waist-Length</option><option>Floor-Length</option>
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="hairColor">Color</label>
                    <input type="text" id="hairColor" name="color" value={hairConfig.color} onChange={handleHairConfigChange} placeholder="e.g., platinum blonde"/>
                </div>
                 <div className="control-group">
                    <label htmlFor="hairAccessories">Accessories</label>
                    <input type="text" id="hairAccessories" name="accessories" value={hairConfig.accessories} onChange={handleHairConfigChange} placeholder="e.g., beads, clips"/>
                </div>
            </div>
        </div>
        
        <h3>Makeup Studio</h3>
        <div className="studio-section makeup-studio">
            <div className="makeup-tabs">
                <button className={activeMakeupTab === 'Presets' ? 'active' : ''} onClick={() => setActiveMakeupTab('Presets')}>Complete Looks</button>
                <button className={activeMakeupTab === 'Foundation' ? 'active' : ''} onClick={() => setActiveMakeupTab('Foundation')}>Foundation</button>
                <button className={activeMakeupTab === 'Eyes' ? 'active' : ''} onClick={() => setActiveMakeupTab('Eyes')}>Eyes & Lashes</button>
                <button className={activeMakeupTab === 'Lips' ? 'active' : ''} onClick={() => setActiveMakeupTab('Lips')}>Lips & Gloss</button>
                <button className={activeMakeupTab === 'Cheeks' ? 'active' : ''} onClick={() => setActiveMakeupTab('Cheeks')}>Blush & Highlight</button>
            </div>
            {activeMakeupTab === 'Presets' && (
                <div className="control-group">
                    <label htmlFor="makeupPreset">Makeup Preset</label>
                    <select id="makeupPreset" name="preset" value={makeupConfig.preset} onChange={handleMakeupConfigChange}>
                        {MAKEUP_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            )}
            {activeMakeupTab === 'Foundation' && (
                <div className="grid-controls">
                    <div className="control-group slider-group"><label>Shade: {makeupConfig.foundationShade}</label><input type="range" name="foundationShade" value={makeupConfig.foundationShade} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/></div>
                    <div className="control-group"><label>Undertone</label><select name="undertone" value={makeupConfig.undertone} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}><option>Neutral</option><option>Warm</option><option>Cool</option><option>Olive</option><option>Golden</option><option>Caramel</option></select></div>
                    <div className="control-group toggle-group"><label>Finish:</label><label><input type="radio" name="foundationFinish" value="Matte" checked={makeupConfig.foundationFinish === 'Matte'} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/> Matte</label><label><input type="radio" name="foundationFinish" value="Glossy" checked={makeupConfig.foundationFinish === 'Glossy'} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/> Glossy</label></div>
                </div>
            )}
            {activeMakeupTab === 'Eyes' && (<div className="control-group slider-group"><label>Lash Length: {makeupConfig.lashLength}</label><input type="range" name="lashLength" value={makeupConfig.lashLength} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/></div>)}
            {activeMakeupTab === 'Lips' && (<div className="grid-controls"><div className="control-group slider-group"><label>Lip Color Intensity: {makeupConfig.lipIntensity}</label><input type="range" name="lipIntensity" value={makeupConfig.lipIntensity} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/></div><div className="control-group toggle-group"><label>Finish:</label><label><input type="radio" name="lipFinish" value="Matte" checked={makeupConfig.lipFinish === 'Matte'} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/> Matte</label><label><input type="radio" name="lipFinish" value="Glossy" checked={makeupConfig.lipFinish === 'Glossy'} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/> Glossy</label></div></div>)}
            {activeMakeupTab === 'Cheeks' && (<div className="grid-controls"><div className="control-group slider-group"><label>Blush Intensity: {makeupConfig.blushIntensity}</label><input type="range" name="blushIntensity" value={makeupConfig.blushIntensity} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/></div><div className="control-group slider-group"><label>Highlight Intensity: {makeupConfig.highlightIntensity}</label><input type="range" name="highlightIntensity" value={makeupConfig.highlightIntensity} onChange={handleMakeupConfigChange} disabled={makeupConfig.preset !== 'Default'}/></div></div>)}
        </div>

        <h3>Fashion & Style</h3>
        <div className="grid-controls">
            <div className="control-group"><label htmlFor="outfit">Outfit Description</label><input type="text" id="outfit" name="outfit" placeholder="e.g., a red ball gown" value={promptConfig.outfit} onChange={handleConfigChange} /></div>
            <div className="control-group"><label htmlFor="accessories">Accessories</label><input type="text" id="accessories" name="accessories" placeholder="e.g., Gucci bag, pearl necklace" value={promptConfig.accessories} onChange={handleConfigChange} /></div>
            <div className="control-group">
              <label htmlFor="style">Clothing Style</label>
               <select id="style" name="style" value={promptConfig.style} onChange={handleConfigChange}>
                <option value="Haute Couture">Haute Couture</option><option value="Streetwear">Streetwear</option>
                <option value="Business Casual">Business Casual</option><option value="Bohemian">Bohemian</option>
                <option value="Tomboy">Tomboy</option><option value="Boudoir">Boudoir</option><option value="Casual">Casual</option>
                <option value="Dressy">Dressy</option><option value="Athleisure">Athleisure</option>
                <option value="Swimwear">Swimwear</option><option value="Lingerie">Lingerie</option>
                <option value="Chanel">Chanel</option><option value="Gucci">Gucci</option><option value="Balenciaga">Balenciaga</option>
                <option value="Dior">Dior</option><option value="Louis Vuitton">Louis Vuitton</option><option value="Prada">Prada</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="season">Seasonal Attire</label>
               <select id="season" name="season" value={promptConfig.season} onChange={handleConfigChange}>
                <option value="None">None</option><option value="Spring">Spring</option><option value="Summer">Summer</option>
                <option value="Autumn">Autumn</option><option value="Winter">Winter</option>
               </select>
            </div>
        </div>
        
        <h3>Background & Scene</h3>
        <div className="grid-controls">
            <div className="control-group">
                <label htmlFor="backgroundType">Background Type</label>
                <select id="backgroundType" name="backgroundType" value={promptConfig.backgroundType} onChange={handleConfigChange}>
                    <option value="None">None / Auto</option>
                    <option value="Studio (Plain)">Studio (Plain)</option>
                    <option value="Outdoor City">Outdoor City</option>
                    <option value="Nature Landscape">Nature Landscape</option>
                    <option value="Abstract Gradient">Abstract Gradient</option>
                    <option value="Luxury Penthouse">Luxury Penthouse</option>
                    <option value="Mansion Interior">Mansion Interior</option>
                    <option value="Hotel Lobby">Hotel Lobby</option>
                    <option value="Marble Staircase">Marble Staircase</option>
                    <option value="Elevator Shoot">Elevator Shoot</option>
                    <option value="Solid Color">Solid Color</option>
                </select>
            </div>
            {promptConfig.backgroundType === 'Solid Color' && (
                <div className="control-group">
                    <label htmlFor="backgroundColor">Background Color</label>
                    <input type="text" id="backgroundColor" name="backgroundColor" value={promptConfig.backgroundColor} onChange={handleConfigChange} placeholder="e.g., light pink, dark grey" />
                </div>
            )}
        </div>
        
         <div className="control-group">
          <label htmlFor="numberOfImages">Number of Images (Text-only, max 8): {numberOfImages}</label>
          <input type="range" min="1" max="8" id="numberOfImages" name="numberOfImages" value={numberOfImages} onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))} disabled={referenceFiles.length > 0} />
        </div>
        
         <div className="control-group">
          <label htmlFor="aspectRatio">Aspect Ratio (Text-only)</label>
           <select id="aspectRatio" name="aspectRatio" value={promptConfig.aspectRatio} onChange={handleConfigChange} disabled={referenceFiles.length > 0}>
                <option value="1:1">1:1 (Square)</option><option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option><option value="4:3">4:3</option>
                <option value="3:4">3:4</option><option value="3:2">3:2</option><option value="2:3">2:3</option>
          </select>
        </div>

        <button className="action-button" onClick={handleGenerate}>Generate</button>
      </div>
      <div className="output-panel">
        {generatedImages.length === 0 && <p className="placeholder-text">Your generated twin(s) will appear here</p>}
        {generatedImages.length > 0 && (
            <>
                <div className="output-image-grid">
                    {generatedImages.map((src, index) => (
                         <div key={index} className="output-image-container">
                            <img src={src} alt={`Generated twin ${index + 1}`} className="output-image" />
                            <div className="output-actions-single">
                                <button onClick={() => handleDownload(src, index)}>Download</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="output-actions">
                    <button onClick={handleGenerate}>Regenerate</button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

// --- EDIT IMAGE COMPONENT ---
const EditImageView = ({ ai, setGlobalError, setIsGenerating, onImageGenerated }: { ai: GoogleGenAI, setGlobalError: (error: string | null) => void, setIsGenerating: (isGenerating: boolean) => void, onImageGenerated: (images: string[]) => void }) => {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [editedImage, setEditedImage] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setEditedImage(null);
        }
    };
    
    const handleDownload = () => {
        if (!editedImage) return;
        const link = document.createElement('a');
        link.href = editedImage;
        link.download = `twinfluencer-edit_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleEdit = useCallback(async () => {
        if (!uploadedFile || !editPrompt) {
            setGlobalError("Please upload an image and provide an edit prompt.");
            return;
        }
        setIsGenerating(true);
        setGlobalError(null);
        setEditedImage(null);

        try {
            const imagePart = await fileToGenerativePart(uploadedFile);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, { text: editPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imageResponsePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imageResponsePart?.inlineData?.data) {
                 const base64Image = `data:image/png;base64,${imageResponsePart.inlineData.data}`;
                 setEditedImage(base64Image);
                 onImageGenerated([base64Image]);
            } else { throw new Error("Could not get an image from the response."); }
        } catch (err: any) {
            console.error(err);
            setGlobalError(err.message || 'An error occurred while editing the image.');
        } finally {
            setIsGenerating(false);
        }
    }, [ai, uploadedFile, editPrompt, setIsGenerating, setGlobalError, onImageGenerated]);

    return (
        <div className="view-container edit-view">
            <input type="file" id="image-upload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            <label htmlFor="image-upload" className="image-upload-area">
                {previewUrl ? 
                    <img src={previewUrl} alt="upload preview" className="preview-image" /> :
                    <p>Click or drag to upload an image</p>
                }
            </label>
            
            <div className="edit-controls">
                <div className="control-group">
                    <label htmlFor="editPrompt">Edit Instruction</label>
                    <input type="text" id="editPrompt" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g., add a retro filter, change hair to blue" />
                </div>
                 <button className="action-button" onClick={handleEdit} disabled={!uploadedFile || !editPrompt}>Apply Edit</button>
            </div>
            
            <div className="edit-output-wrapper">
                {editedImage ? 
                    <img src={editedImage} alt="Edited result" className="output-image" /> :
                    (previewUrl && <p className="placeholder-text">Your edited image will appear here</p>)
                }
                 {editedImage && (
                    <div className="output-actions">
                        <button onClick={handleDownload}>Download</button>
                        <button onClick={handleEdit}>Regenerate Edit</button>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- MAIN APP ---
const App = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  useEffect(() => {
      const savedImages = localStorage.getItem('twinfluencerGallery');
      if (savedImages) {
          try {
            const parsedImages = JSON.parse(savedImages);
            if(Array.isArray(parsedImages)) {
                setGalleryImages(parsedImages);
            }
          } catch (e) {
            console.error("Failed to parse gallery images from localStorage", e);
            setGalleryImages([]);
          }
      }
  }, []);

  useEffect(() => {
      try {
        localStorage.setItem('twinfluencerGallery', JSON.stringify(galleryImages));
      } catch (e) {
        console.error("Failed to save gallery images to localStorage", e);
      }
  }, [galleryImages]);

  const handleImageGenerated = useCallback((newImages: string[]) => {
      setGalleryImages(prev => [...newImages, ...prev]);
  }, []);
  
  const handleSetGalleryImages = useCallback((images: string[]) => {
      setGalleryImages(images);
  }, []);
  
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  return (
    <>
      <Style />
      <div className="container">
        {isGenerating && <div className="spinner-overlay"><div className="spinner"></div></div>}
        {globalError && <div className="error-toast">{globalError}</div>}
        <header>
          <h1>Twinfluencers</h1>
          <p>Create Your Digital Double</p>
          <div className="tabs">
            <button onClick={() => setActiveTab('generate')} className={activeTab === 'generate' ? 'active' : ''}>Generate Twin</button>
            <button onClick={() => setActiveTab('edit')} className={activeTab === 'edit' ? 'active' : ''}>Edit Image</button>
            <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}>Gallery</button>
          </div>
        </header>
        <main>
          {activeTab === 'generate' && <GenerateTwinView ai={ai} setGlobalError={setGlobalError} setIsGenerating={setIsGenerating} onImageGenerated={handleImageGenerated} /> }
          {activeTab === 'edit' && <EditImageView ai={ai} setGlobalError={setGlobalError} setIsGenerating={setIsGenerating} onImageGenerated={handleImageGenerated}/> }
          {activeTab === 'gallery' && <GalleryView images={galleryImages} setGalleryImages={handleSetGalleryImages} /> }
        </main>
        <footer>
            <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);