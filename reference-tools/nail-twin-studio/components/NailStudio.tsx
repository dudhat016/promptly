import React, { useState } from 'react';
import { generateNailArt, generateTextResponse } from '../services/gemini';
import { LoadingState } from '../types';

// --- DATA CONSTANTS ---

const NAIL_SHAPES = ['Coffin', 'Almond', 'Stiletto', 'Square', 'Oval', 'Round', 'Squoval'];
const NAIL_LENGTHS = ['Short', 'Medium', 'Long', 'Extra-Long'];

const COLLECTIONS = {
  'Trending': [
    { id: 'tortoise', label: 'Tortoise Shell', prompt: 'Tortoiseshell pattern with amber brown swirls' },
    { id: 'glazed', label: 'Glazed Donut', prompt: 'Sheer milky pink base with pearlescent white chrome powder' },
    { id: 'micro_french', label: 'Micro French', prompt: 'Short nude nails with super thin white micro-french tips' },
    { id: 'cherry_red', label: 'Vampy Cherry', prompt: 'Deep dark cherry red, high gloss finish' },
  ],
  'Animal': [
    { id: 'leopard', label: 'Classic Leopard', prompt: 'Classic leopard print with brown spots on nude base' },
    { id: 'croc', label: 'Croc Print', prompt: 'Embossed crocodile texture effect' },
    { id: 'snake', label: 'Snake Skin', prompt: 'Realistic python skin pattern' },
    { id: 'zebra', label: 'Zebra Stripe', prompt: 'Bold black and white zebra stripes' },
    { id: 'cow', label: 'Cow Print', prompt: 'Black irregular spots on white base' },
    { id: 'butterfly', label: 'Butterfly Wing', prompt: 'Detailed monarch butterfly wing pattern' },
  ],
  'Chrome & 3D': [
    { id: 'silver_chrome', label: 'Silver Mirror', prompt: 'Full reflective silver chrome mirror finish' },
    { id: 'gold_chrome', label: 'Gold Mirror', prompt: 'Liquid gold chrome finish' },
    { id: 'cat_eye', label: 'Velvet Cat Eye', prompt: 'Magnetic velvet cat eye effect in silver/grey' },
    { id: '3d_bows', label: 'Coquette Bows', prompt: 'Soft pink nails with 3D white ribbon bows' },
    { id: 'pearls', label: 'Pearl Accents', prompt: 'Nude base with scattered 3D pearl embellishments' },
  ],
  'French': [
    { id: 'classic_french', label: 'Classic French', prompt: 'Traditional pink base with crisp white tips' },
    { id: 'v_tip', label: 'V-Tip French', prompt: 'Deep V-shaped chevron french tip' },
    { id: 'chrome_tips', label: 'Chrome Tips', prompt: 'Nude base with metallic silver chrome french tips' },
    { id: 'black_tips', label: 'Black Tips', prompt: 'Edgy nude nails with glossy black french tips' },
  ],
  'Ombre': [
    { id: 'baby_boomer', label: 'Baby Boomer', prompt: 'Classic pink to white gradient fade (French Ombre)' },
    { id: 'sunset', label: 'Sunset Aura', prompt: 'Orange to pink to purple aura gradient center' },
    { id: 'vertical', label: 'Vertical Aura', prompt: 'Vertical two-tone soft gradient' },
  ],
  'Texture': [
    { id: 'matte', label: 'Matte Velvet', prompt: 'Full matte finish topcoat' },
    { id: 'sweater', label: 'Sweater Knit', prompt: '3D textured cable knit pattern' },
    { id: 'jelly', label: 'Jelly Tint', prompt: 'Translucent "jelly" fruit color finish' },
  ]
};

const POSE_OPTIONS = [
    { id: 'flat', label: 'Relaxed Flat', icon: '🤚', prompt: 'Position: Hand lying flat on surface, fingers slightly spread, palm down, natural curve. Best for product displays.' },
    { id: 'curve', label: 'Graceful Curve', icon: '💅', prompt: 'Position: Hand curved at natural angle, fingers gently bent, wrist tilted elegantly to show nail bed.' },
    { id: 'fingertips', label: 'Fingertips Together', icon: '🤌', prompt: 'Position: Fingertips touching gently in a pyramid shape, nails facing camera. Elegant and poised.' },
    { id: 'crossed', label: 'Hand on Hand', icon: '🤞', prompt: 'Position: One hand resting gently on the other, crossed or stacked position.' },
    { id: 'reaching', label: 'Reaching', icon: '🫳', prompt: 'Position: Hand extended naturally as if reaching for an object, fingers slightly curled.' },
    { id: 'grip', label: 'Gentle Grip', icon: '✊', prompt: 'Position: Hand loosely holding an object, natural finger placement, relaxed hold.' },
    { id: 'face_frame', label: 'Face Framing', icon: '🖼️', prompt: 'Position: Hand near face/chin, fingers delicately positioned to create an elegant frame.' },
    { id: 'pointing', label: 'Pointing', icon: '☝️', prompt: 'Position: One or two fingers extended, rest of hand relaxed. Editorial gesture.' },
];

const SCENE_PRESETS = [
    { id: 'purse', label: 'Designer Purse', icon: '👜', prompt: 'Scene: Hand resting on a textured luxury designer handbag (leather/quilted) with gold hardware.' },
    { id: 'wheel', label: 'Steering Wheel', icon: '🚗', prompt: 'Scene: Hand holding a luxury car steering wheel with dashboard visible in background.' },
    { id: 'wine', label: 'Wine Glass', icon: '🍷', prompt: 'Scene: Fingers delicately holding the stem of a crystal wine glass. Elegant dinner setting.' },
    { id: 'champagne', label: 'Champagne', icon: '🥂', prompt: 'Scene: Hand holding a champagne flute with bubbles visible. Celebratory atmosphere.' },
    { id: 'coffee', label: 'Coffee Cup', icon: '☕', prompt: 'Scene: Hands cradling a warm coffee cup or holding an iced latte. Cozy aesthetic.' },
    { id: 'phone', label: 'Holding Phone', icon: '📱', prompt: 'Scene: Hand holding a smartphone with a designer case. Mirror selfie vibe.' },
    { id: 'marble', label: 'Marble Surface', icon: '🏛️', prompt: 'Scene: Hand resting flat on a clean white Carrara marble countertop. Minimalist.' },
    { id: 'jewelry', label: 'Jewelry Box', icon: '💍', prompt: 'Scene: Hand reaching into a velvet jewelry box. Luxury organization.' },
    { id: 'book', label: 'Reading', icon: '📖', prompt: 'Scene: Hand holding an open book or magazine. Cozy intellectual vibe.' },
    { id: 'silk', label: 'Silk Sheets', icon: '🛌', prompt: 'Scene: Hand resting on luxurious silk or satin bed sheets. Soft boudoir lighting.' },
    { id: 'chin_rest', label: 'Chin Rest', icon: '🤔', prompt: 'Scene: Hand resting under chin thoughtfully. Intimate portrait style.' },
    { id: 'cheek', label: 'Cheek Touch', icon: '😊', prompt: 'Scene: Hand gently touching cheek, glowing skin visible. Beauty portrait.' },
    { id: 'lips', label: 'Near Lips', icon: '💋', prompt: 'Scene: Fingertips hovering near lips. Sensual and elegant editorial shot.' },
    { id: 'forehead', label: 'Forehead Touch', icon: '😓', prompt: 'Scene: Hand resting on forehead. Casual authentic lifestyle moment.' },
    { id: 'holding_hands', label: 'Holding Hands', icon: '🤝', prompt: 'Scene: Two hands intertwined. Romantic connection vibe.' },
    { id: 'flowers', label: 'Bouquet', icon: '💐', prompt: 'Scene: Hand holding a fresh bouquet of flowers. Natural outdoor light.' },
    { id: 'sunglasses', label: 'Sunglasses', icon: '😎', prompt: 'Scene: Hand adjusting or holding a pair of chic designer sunglasses.' },
    { id: 'shopping', label: 'Shopping Bags', icon: '🛍️', prompt: 'Scene: Hand holding handles of luxury shopping bags. Retail therapy.' },
    { id: 'laptop', label: 'Laptop', icon: '💻', prompt: 'Scene: Hands resting on a laptop keyboard. Modern boss babe aesthetic.' },
    { id: 'cozy', label: 'Cozy Blanket', icon: '🧶', prompt: 'Scene: Hand holding a soft, chunky knit blanket. Hygge comfort vibes.' },
];

const NailStudio: React.FC = () => {
  const [handFile, setHandFile] = useState<File | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  
  // Selection State
  const [selectedCategory, setSelectedCategory] = useState<string>('Trending');
  const [selectedDesign, setSelectedDesign] = useState<{id: string, prompt: string} | null>(null);
  const [selectedPose, setSelectedPose] = useState<string>('');
  const [selectedScene, setSelectedScene] = useState<string>('');
  
  // Customization State
  const [nailShape, setNailShape] = useState<string>('Coffin');
  const [nailLength, setNailLength] = useState<string>('Long');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);

  const handleGenerate = async () => {
    if (!handFile) {
      alert("Please upload a hand reference photo first.");
      return;
    }

    setLoadingState(LoadingState.LOADING);
    
    // Build the strict prompt formula: [HAND_POSITION] + [NAIL_DESIGN] + [SCENE_ELEMENT] + [ACCESSORIES]
    const parts = [];
    
    // 1. Nail Design Details
    let designDetail = "";
    if (selectedDesign) {
        designDetail = `Nail Design: ${selectedDesign.prompt}.`;
    } else if (customPrompt) {
        designDetail = `Nail Design: ${customPrompt}.`;
    } else if (!designFile) {
        designDetail = `Nail Design: High-gloss trending luxury manicure.`;
    }
    // Add Shape & Length
    designDetail += ` Shape: ${nailShape}. Length: ${nailLength}.`;
    parts.push(designDetail);

    // 2. Hand Position
    if (selectedPose) parts.push(selectedPose);

    // 3. Scene Elements
    if (selectedScene) parts.push(selectedScene);

    // 4. Accessories & Aesthetic
    parts.push("Accessories: Elegant gold rings if appropriate for scene. Overall Aesthetic: High-end Instagram lifestyle.");

    const fullPrompt = parts.join('\n');
    console.log("Generating with prompt:", fullPrompt);

    try {
      const result = await generateNailArt(handFile, designFile, fullPrompt);
      setResultImage(result);
      setLoadingState(LoadingState.SUCCESS);
    } catch (error) {
      console.error(error);
      setLoadingState(LoadingState.ERROR);
      alert("Failed to generate image. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 md:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN: CONTROLS --- */}
        <div className="lg:col-span-5 space-y-4 h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* STEP 1: HAND REFERENCE */}
          <div className="glass-panel p-4 rounded-2xl shadow-sm border-l-4 border-rose-400">
            <h2 className="text-sm font-bold mb-2 text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-rose-100 text-rose-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
              Hand Reference
            </h2>
            <div className="relative border-2 border-dashed border-rose-200 bg-rose-50/30 rounded-xl h-24 flex items-center justify-center cursor-pointer hover:bg-rose-50 transition-colors group">
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => setHandFile(e.target.files?.[0] || null)}
              />
              {handFile ? (
                 <div className="absolute inset-0 p-1">
                   <img src={URL.createObjectURL(handFile)} alt="Hand" className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">Change</div>
                 </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="material-icons text-xl text-rose-300">add_a_photo</span>
                  <span className="text-[10px] text-rose-400 font-bold mt-1">UPLOAD HANDS</span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: DESIGN SELECTOR */}
          <div className="glass-panel p-4 rounded-2xl shadow-sm border-l-4 border-purple-400">
             <h2 className="text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
              Nail Design
            </h2>
            
            {/* Collection Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              {Object.keys(COLLECTIONS).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    selectedCategory === cat 
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Design Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {(COLLECTIONS as any)[selectedCategory].map((design: any) => (
                    <button
                        key={design.id}
                        onClick={() => { setSelectedDesign(design); setDesignFile(null); setCustomPrompt(''); }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                            selectedDesign?.id === design.id
                            ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                        <div className="text-xs font-bold text-gray-700">{design.label}</div>
                        <div className="text-[9px] text-gray-400 leading-tight mt-0.5 line-clamp-2">{design.prompt}</div>
                    </button>
                ))}
            </div>

            {/* OR Upload */}
            <div className="relative border border-dashed border-purple-200 bg-purple-50/30 rounded-lg p-2 text-center hover:bg-purple-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => { setDesignFile(e.target.files?.[0] || null); setSelectedDesign(null); }}
              />
              <span className="material-icons text-sm text-purple-400">upload_file</span>
              <span className="text-[10px] text-purple-500 font-medium">
                  {designFile ? "Custom Reference Uploaded" : "Or Upload Design Photo"}
              </span>
              {designFile && <button onClick={(e) => { e.preventDefault(); setDesignFile(null); }} className="z-20 text-red-500 ml-auto"><span className="material-icons text-sm">close</span></button>}
            </div>
          </div>

          {/* STEP 3: CUSTOMIZE SPECS */}
          <div className="glass-panel p-4 rounded-2xl shadow-sm border-l-4 border-blue-400">
            <h2 className="text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                Specs
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Shape</label>
                    <select 
                        value={nailShape} 
                        onChange={(e) => setNailShape(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                        {NAIL_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Length</label>
                    <select 
                        value={nailLength} 
                        onChange={(e) => setNailLength(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                        {NAIL_LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>
          </div>

          {/* STEP 4: POSE & SCENE */}
          <div className="glass-panel p-4 rounded-2xl shadow-sm border-l-4 border-indigo-400">
            <h2 className="text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">4</span>
                Pose & Scene
            </h2>

            {/* Poses */}
            <div className="mb-3">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Position</p>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {POSE_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedPose(option.prompt)}
                            className={`flex-shrink-0 p-2 rounded-lg border min-w-[80px] text-center transition-all ${
                                selectedPose === option.prompt 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                                : 'border-gray-200 bg-white text-gray-500'
                            }`}
                        >
                            <div className="text-lg">{option.icon}</div>
                            <div className="text-[9px] font-bold mt-1 whitespace-nowrap">{option.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Scenes */}
            <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Background</p>
                <div className="h-32 overflow-y-auto pr-1 custom-scrollbar bg-gray-50/50 rounded-lg border border-gray-100 p-1">
                    <div className="grid grid-cols-2 gap-1">
                        {SCENE_PRESETS.map(scene => (
                            <button
                                key={scene.id}
                                onClick={() => setSelectedScene(scene.prompt)}
                                className={`flex items-center gap-2 p-1.5 rounded-md border text-left transition-all ${
                                    selectedScene === scene.prompt 
                                    ? 'border-indigo-500 bg-white shadow-sm' 
                                    : 'border-transparent hover:bg-white hover:shadow-sm opacity-70 hover:opacity-100'
                                }`}
                            >
                                <span className="text-sm">{scene.icon}</span>
                                <span className="text-[10px] font-medium truncate text-gray-600">{scene.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loadingState === LoadingState.LOADING || !handFile}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg uppercase tracking-widest transition-all duration-300 ${
              loadingState === LoadingState.LOADING || !handFile
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-black hover:bg-gray-900 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {loadingState === LoadingState.LOADING ? 'Retouching & Rendering...' : 'Generate Visualization'}
          </button>
        </div>

        {/* --- RIGHT COLUMN: OUTPUT --- */}
        <div className="lg:col-span-7">
           <div className="h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl p-1 border border-gray-200 relative overflow-hidden flex flex-col">
              
              {resultImage ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden group bg-black flex items-center justify-center">
                  <img src={resultImage} alt="Generated Nail Art" className="max-w-full max-h-full object-contain" />
                  
                  {/* Watermark / Branding */}
                  <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-white/80 text-[10px] font-bold border border-white/20">
                      NAIL TWIN STUDIO
                  </div>

                  {/* Overlay Controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex justify-between items-end">
                     <div className="text-white">
                         <p className="font-serif text-xl italic">Perfect Match</p>
                         <p className="text-xs text-gray-300 opacity-80 mt-1">{selectedDesign?.label || 'Custom Design'} • {nailShape} • {nailLength}</p>
                     </div>
                     <a 
                        href={resultImage} 
                        download="nail-twin-studio-render.png"
                        className="bg-white text-black px-5 py-2.5 rounded-full text-xs font-bold hover:bg-rose-50 transition-colors shadow-lg flex items-center gap-2"
                    >
                        <span className="material-icons text-sm">download</span>
                        SAVE 4K
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                   {loadingState === LoadingState.LOADING ? (
                     <div className="space-y-6">
                        <div className="relative mx-auto w-24 h-24">
                            <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-rose-500 animate-spin absolute inset-0"></div>
                            <div className="w-24 h-24 rounded-full border-r-4 border-l-4 border-purple-500 animate-spin absolute inset-0 opacity-50 reverse-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-icons text-3xl text-gray-400">auto_fix_high</span>
                            </div>
                        </div>
                        <div className="animate-pulse">
                            <h3 className="text-lg font-bold text-gray-800">AI Artist is Working...</h3>
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <p>1. Analyzing hand structure...</p>
                                <p>2. Retouching skin texture...</p>
                                <p>3. Applying {nailShape} {nailLength} design...</p>
                                <p>4. Rendering lighting...</p>
                            </div>
                        </div>
                     </div>
                   ) : (
                     <div className="max-w-xs space-y-4 opacity-50">
                        <div className="w-32 h-32 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto border border-gray-200">
                             <span className="material-icons text-6xl text-gray-200">spa</span>
                        </div>
                        <h2 className="text-2xl font-serif text-gray-800">Virtual Studio</h2>
                        <p className="text-xs text-gray-500 leading-relaxed">
                           Select your preferences on the left to generate a photorealistic preview of your next manicure.
                        </p>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default NailStudio;