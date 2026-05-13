import React, { useState, useCallback } from 'react';
import { analyzeImage, editImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import JSZip from 'jszip';

// --- Icons ---

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.84 2.84l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.84 2.84l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.84-2.84l-2.846-.813a.75.75 0 010-1.442l2.846.813a3.75 3.75 0 002.84-2.84l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036a5.25 5.25 0 003.586 3.586l1.036.258a.75.75 0 010 1.456l-1.036.258a5.25 5.25 0 00-3.586 3.586l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a5.25 5.25 0 00-3.586-3.586l-1.036-.258a.75.75 0 010-1.456l1.036-.258a5.25 5.25 0 003.586-3.586l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.558l.127.447a2.25 2.25 0 001.534 1.534l.447.127a.75.75 0 010 1.424l-.447.127a2.25 2.25 0 00-1.534 1.534l-.127.447a.75.75 0 01-1.424 0l-.127-.447a2.25 2.25 0 00-1.534-1.534l-.447-.127a.75.75 0 010-1.424l.447.127a2.25 2.25 0 001.534-1.534l.127.447a.75.75 0 01.712-.558z" clipRule="evenodd" />
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ArchiveBoxIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3.25h3m-3-3.75h3m-12-3h15.656c.83 0 1.5.67 1.5 1.5v.69c0 .71-.52 1.295-1.215 1.416l-14.164 2.242c-.73.116-1.35-.435-1.35-1.175v-.69c0-.83.67-1.5 1.5-1.5zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
    </svg>
);

const ScissorsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 013.628 8.592l-5.325 1.629a4.324 4.324 0 01-2.068-1.379M14.33 16.86c.04.345.04.69.014 1.035l-1.124 1.946a8.25 8.25 0 006.228-2.734l-1.955-1.128a1.497 1.497 0 01-.918-.843z" />
    </svg>
);

// --- Types & Constants ---

interface ImageData {
  file: File;
  base64: string;
}

interface GeneratedImage {
  scene: string;
  image: string;
  id: number;
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];
const HAIR_STYLES = [
    'Straight & Sleek',
    'Bone Straight with Middle Part',
    'Voluminous Curls', 
    'Beach Waves', 
    'High Ponytail', 
    'Chic Bob', 
    'Pixie Cut', 
    'Long Layered', 
    'Messy Bun', 
    'Box Braids', 
    'Hollywood Glam Waves', 
    'Half-Up Half-Down', 
    'Wet Look',
    'Afro Textured',
    'Silk Press'
];

const MAKEUP_LOOKS = [
    'Soft Glam (Default)',
    'No Makeup Makeup',
    'Full Glam (Heavy Contour)',
    'Dewy & Fresh',
    'Matte Finish',
    'Smokey Eye Evening',
    'Vintage / Retro Red Lip',
    'Bronzed Goddess',
    'Clean Girl Aesthetic'
];

const SKIN_TEXTURES = [
    'Glass Skin (Dewy)',
    'Soft Matte (Velvet)',
    'Satin Finish',
    'Sun-Kissed Glow',
    'Hyper-Realistic Texture',
    'Airbrushed Perfection'
];

const EYE_COLORS = [
    'Natural (Match Original)',
    'Amber',
    'Icy Blue',
    'Emerald Green',
    'Hazel',
    'Warm Brown',
    'Dark Brown/Black',
    'Violet',
    'Gray'
];

const SCENE_CATEGORIES: Record<string, string[]> = {
  'Fashion & Outfit': [
    'Coordinated monochrome outfit with statement sneakers', 'Luxury handbag reveal on marble countertop', 'Designer shoe collection display on shelves', 'Outfit of the day mirror selfie', 'Matching set loungewear with accessories',
    'Layered jewelry close-up on neck and wrists', 'Sunglasses collection flat lay', 'Closet organization aesthetic', 'Unboxing designer shopping bags', 'Trying on multiple outfit options',
    'Seasonal capsule wardrobe display', 'Mixing high and low fashion pieces', 'Airport travel outfit showcase', 'Date night outfit preparation', 'Gym outfit with matching accessories',
    'Business casual ensemble', 'Weekend brunch look', 'Evening gown with jewelry', 'Cozy fall sweater and boots', 'Summer dress with beach accessories', 'Athleisure outfit coordination',
    'Denim styling multiple ways', 'Blazer and jeans combination', 'All-white outfit aesthetic', 'Colorful statement piece styling', 'Vintage thrifted finds showcase', 'Designer belt collection',
    'Watch and bracelet stacking', 'Hat collection display', 'Scarf styling demonstration', 'Shoe rotation weekly display', 'Sustainable fashion haul', 'Luxury basics collection',
    'Statement coat showcase', 'Bag organization inside view', 'Ring collection on jewelry tray', 'Earring wall display', 'Necklace layering guide', 'Seasonal color palette outfits', 'Fashion week inspired looks'
  ],
  'Nail Art & Manicure': [
      'Leopard print nail art close-up', 'Pink and nude ombre gradient nails', 'Coffin shaped nails with rhinestones', 'Gold foil accent nail design', 'Chrome finish manicure shine',
      'Matte and glossy combo nails', 'French tip with twist variation', 'Marble effect nail art', 'Animal print mixed designs', 'Geometric pattern nails modern',
      'Negative space nail art', 'Tortoiseshell pattern nails', 'Glitter gradient ombre nails', 'Snake skin print nails', 'Cow print nail design',
      'Zebra stripe nail art', 'Cheetah print nail variation', 'Abstract swirl nail art', 'Minimalist line art nails', 'Pearl embellished nails luxury',
      '3D flower nail design', 'Encapsulated glitter nails', 'Holographic chrome nails', 'Jelly nails translucent effect', 'Aura nails gradient glow',
      'Glazed donut nail trend', 'Milk bath nails soft', 'Butterfly nail art delicate', 'Heart design valentine nails', 'Star and moon celestial',
      'Gradient sunset nail art', 'Ocean wave nail design', 'Tie-dye swirl nails', 'Checkerboard pattern nails', 'Plaid nail art design',
      'Floral pressed flower nails', 'Dried flower encapsulation', 'Color block nail art', 'Neon pop accent nails', 'Pastel rainbow gradient nails',
      'Nude with gold stripes', 'White tips summer fresh', 'Red and gold holiday', 'Black and silver edgy', 'Blue and silver winter',
      'Green and gold elegant', 'Purple and gold royal', 'Pink and white classic', 'Beige and brown earth', 'Clear with gold flakes'
  ],
  'Beauty & Makeup': [
    'Makeup vanity organization aesthetic', 'Morning skincare routine steps', 'Foundation shade matching', 'Lipstick collection rainbow display', 'Nail art designs close-up',
    'Fresh manicure with accessories', 'Lash extension before/after', 'Hair styling transformation', 'Perfume collection display', 'Beauty fridge organization',
    'Sheet mask self-care moment', 'Eyeshadow palette arrangement', 'Makeup brush cleaning session', 'Glowy skin close-up', 'Contour and highlight application',
    'Brow lamination results', 'Hair color transformation', 'Curling routine process', 'Blowout styling at salon', 'Spa day facial treatment',
    'Makeup removal routine', 'Nighttime skincare ritual', 'Beauty tool collection', 'Highlighter swatch comparison', 'Lip gloss collection', 'Fragrance layering demonstration',
    'Hair mask treatment', 'Nail polish color selection', 'Makeup look for different occasions', 'Skincare product empties', 'Beauty haul unboxing', 'Makeup storage solutions',
    'Travel beauty bag essentials', 'Natural makeup look tutorial', 'Glam makeup transformation', 'Eyeliner styles showcase', 'Blush placement techniques', 'Setting spray application',
    'Hair accessories collection', 'Beauty advent calendar opening'
  ],
  'Luxury Accessories': [
    'Designer handbag collection wall', 'Watch collection in display case', 'Diamond ring close-up on hand', 'Bracelet stacking on wrist', 'Sunglasses case collection',
    'Wallet and cardholder showcase', 'Belt collection organized', 'Luxury keychain with keys', 'Phone case collection', 'Airpod case designer edition', 'Jewelry box organization',
    'Necklace layering techniques', 'Earring tree display', 'Anklet summer styling', 'Hair accessories luxury brands', 'Designer scarf folding', 'Luxury umbrella collection',
    'Pen collection display', 'Notebook and planner aesthetic', 'Tech accessories luxury edition', 'Travel accessories designer set', 'Luggage tag collection', 'Passport holder showcase',
    'Eyewear case collection', 'Cufflinks and tie clips', 'Brooch collection vintage', 'Hair clips designer showcase', 'Toe ring summer display', 'Body jewelry aesthetic',
    'Charm bracelet close-up', 'Pearl jewelry collection', 'Gold jewelry warm tones', 'Silver jewelry cool tones', 'Mixed metals styling', 'Statement piece jewelry',
    'Stacked gold rings display', 'Diamond solitaire engagement ring', 'Midi rings multiple fingers', 'Cocktail ring statement piece', 'Wedding band set matching',
    'Signet ring personal initial', 'Birthstone ring collection monthly', 'Promise ring romantic gesture', 'Class ring university pride', 'Eternity band diamond circle'
  ],
  'Luxury Car & Travel': [
    'Luxury car interior aesthetic', 'Steering wheel with manicure', 'Car dashboard at golden hour', 'Coffee cup in car holder', 'Backseat shopping bags haul',
    'Car selfie with outfit', 'Keys on luxury car hood', 'Sunroof view aesthetic', 'Car seat designer handbag', 'Gas station outfit check', 'Car wash day content',
    'Road trip essentials', 'Carpool karaoke moment', 'Drive-through coffee run', 'Parking lot fashion shoot', 'Car freshener collection', 'Dashboard camera aesthetic',
    'Night drive city lights', 'Scenic route driving', 'Car picnic setup', 'Trunk organization system', 'License plate aesthetic', 'Car detailing results', 'Sunset driving view', 'First car celebration',
    'Private jet boarding stairs', 'Airport tarmac walking', 'Security detail formation', 'Bodyguard opening door professional', 'VIP lounge waiting area',
    'First class check-in counter', 'Priority boarding line skip', 'TSA PreCheck expedited security', 'Clear entry lane fast', 'Passport control VIP lane',
    'Customs declaration priority', 'Luggage carousel luxury bags', 'Porter handling bags service', 'Valet parking luxury hotel', 'Red carpet event arrival',
    'Paparazzi camera flashes crowd', 'Velvet rope VIP entrance', 'Bouncer checking guest list', 'Private entrance back door', 'Elevator to penthouse suite'
  ],
  'Shopping & Retail': [
    'Beauty store shopping spree', 'Sephora basket haul', 'Designer store browsing', 'Shopping cart full aesthetic', 'Trying on clothes in fitting room', 'Store mirror selfie',
    'Shopping bag collection carry', 'Retail therapy moment', 'Unboxing online orders', 'Mall shopping day outfit', 'Boutique browsing aesthetic', 'Cashier checkout moment',
    'Shopping with friends', 'Personal shopper experience', 'Window shopping displays', 'Sale rack finding gems', 'Luxury store entrance', 'Shopping list check-off',
    'Comparing product options', 'Testing makeup in store', 'Shoe shopping try-on', 'Jewelry counter browsing', 'Handbag section exploring', 'Perfume counter testing',
    'Sunglasses trying on', 'Tech store browsing', 'Bookstore coffee shop', 'Home decor shopping', 'Grocery store aesthetic haul', 'Farmers market shopping'
  ],
  'Food & Beverage': [
    'Iced coffee aesthetic hold', 'Green juice health kick', 'Smoothie bowl presentation', 'Avocado toast brunch', 'Charcuterie board styling', 'Wine glass cheers moment',
    'Champagne celebration pop', 'Matcha latte art', 'Acai bowl colorful toppings', 'Sushi platter aesthetic', 'Pizza night with friends', 'Dessert table display',
    'Cupcake decorated pretty', 'Macarons colorful arrangement', 'Bubble tea holding', 'Fresh juice bar visit', 'Restaurant table setting', 'Chef\'s tasting menu',
    'Picnic basket setup', 'Beach cooler drinks', 'Hot chocolate cozy moment', 'Salad bowl healthy lunch', 'Pasta dish Italian vibes', 'Steak dinner date night',
    'Breakfast in bed tray', 'Afternoon tea setup', 'Cocktail hour drinks', 'Fresh fruit platter', 'Cheese board wine pairing', 'Food prep meal planning'
  ],
  'Home & Lifestyle': [
    'Bedroom aesthetic morning', 'Closet organization goals', 'Bathroom vanity setup', 'Living room cozy corner', 'Kitchen marble countertop', 'Home office workspace',
    'Balcony morning coffee', 'Bathtub self-care soak', 'Bed making routine', 'Candle lighting ambiance', 'Plant watering routine', 'Reading nook cozy setup',
    'TV show binge watching', 'Laundry day organization', 'Vacuum cleaning aesthetic', 'Flowers arranging vase', 'Mirror cleaning shine', 'Pillows fluffing bed',
    'Curtains opening morning light', 'Trash taking out routine', 'Dishes washing kitchen', 'Cooking dinner prep', 'Baking cookies oven', 'Cleaning supplies organized',
    'Dusting shelves routine', 'Mopping floors clean', 'Window view appreciation', 'Doormat welcome aesthetic', 'Keys hanging entryway', 'Mail sorting desk'
  ],
  'Travel & Adventure': [
    'Packing suitcase organized', 'Airport outfit walking', 'Airplane window seat view', 'Hotel room arrival', 'Beach sunset walking', 'City skyline viewing',
    'Mountain hiking adventure', 'Pool floating relaxation', 'Passport stamps collection', 'Travel journal writing', 'Road trip map planning', 'Tourist attraction visiting',
    'Local market exploring', 'Street food trying', 'Museum art viewing', 'Historical site touring', 'Beach towel laying', 'Cruise ship deck', 'Camping tent setup',
    'Ski slope action', 'Theme park rides', 'Concert venue attending', 'Sports game watching', 'Festival grounds exploring', 'Scenic lookout point'
  ],
  'Fitness & Wellness': [
    'Gym workout session', 'Yoga mat stretching', 'Running track sprinting', 'Weight lifting dumbbells', 'Pilates reformer class', 'Spin class cycling',
    'Boxing gloves training', 'Swimming pool laps', 'Dance class moving', 'Hiking trail walking', 'Rock climbing wall', 'Tennis court playing',
    'Basketball court shooting', 'Volleyball beach game', 'Roller skating rink', 'Ice skating practice', 'Surfing waves catching', 'Paddleboarding balance',
    'Kayaking water adventure', 'Meditation quiet moment', 'Spa massage session', 'Sauna relaxation time', 'Steam room detox', 'Facial treatment peaceful', 'Acupuncture session healing'
  ],
  'Work & Productivity': [
    'Laptop desk working', 'Coffee shop studying', 'Library quiet reading', 'Meeting notes taking', 'Phone call professional', 'Planner organizing week',
    'Calendar scheduling events', 'Emails responding inbox', 'Presentation preparing slides', 'Brainstorming ideas whiteboard', 'Video call from home',
    'Desk organization tidy', 'Printer documents printing', 'Signature signing contract', 'Handshake deal closing', 'Business cards exchanging',
    'Office building entrance', 'Elevator corporate aesthetic', 'Conference room meeting', 'Success celebration achievement'
  ]
};


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [customScene, setCustomScene] = useState<string>('');
  const [characterProfile, setCharacterProfile] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  // Configuration State
  const [quantity, setQuantity] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [hairStyle, setHairStyle] = useState<string>('Straight & Sleek');
  const [makeupLook, setMakeupLook] = useState<string>('Soft Glam (Default)');
  const [skinTexture, setSkinTexture] = useState<string>('Glass Skin (Dewy)');
  const [eyeColor, setEyeColor] = useState<string>('Natural (Match Original)');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setGeneratedImages([]);
      setCharacterProfile(null);
      try {
        const base64 = await fileToBase64(file);
        setOriginalImage({ file, base64 });
      } catch (err) {
        setError('Failed to load image. Please try another file.');
        setOriginalImage(null);
      }
    }
  }, []);

  const toggleScene = (scene: string) => {
    setSelectedScenes(prev => prev.includes(scene) ? prev.filter(s => s !== scene) : [...prev, scene]);
  };

  const addCustomScene = () => {
      if(customScene.trim()) {
          setSelectedScenes(prev => [...prev, customScene.trim()]);
          setCustomScene('');
      }
  }

  const handleRemoveBackground = async () => {
      if(!originalImage) return;
      setIsLoading(true);
      setError(null);
      try {
          let profile = characterProfile;
          if(!profile) {
              setLoadingMessage('Analyzing biometric features for perfect isolation...');
              profile = await analyzeImage(originalImage.base64, originalImage.file.type);
              setCharacterProfile(profile);
          }
          
          setLoadingMessage('Removing background & Perfecting subject...');
          const result = await editImage(
              originalImage.base64, 
              originalImage.file.type, 
              "Remove background", 
              profile, 
              { removeBackground: true, hairStyle, makeupLook, skinTexture, eyeColor }
          );

          if(result) {
              setGeneratedImages(prev => [{ scene: 'Background Removed', image: `data:image/png;base64,${result}`, id: Date.now() }, ...prev]);
          }
      } catch(err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  }

  const handleGenerate = async () => {
    if (!originalImage) {
        setError("Please upload a photo first.");
        return;
    }
    if (selectedScenes.length === 0) {
        setError("Please select at least one scene or add a custom one.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        let profile = characterProfile;
        if (!profile) {
            setLoadingMessage('Analyzing your Twin biometric identity...');
            profile = await analyzeImage(originalImage.base64, originalImage.file.type);
            setCharacterProfile(profile);
        }

        const totalImages = quantity;

        for (let i = 0; i < totalImages; i++) {
            const sceneIndex = i % selectedScenes.length;
            const scenePrompt = selectedScenes[sceneIndex];

            setLoadingMessage(`Creating Twin ${i + 1} of ${totalImages}: ${scenePrompt.substring(0, 30)}...`);
            
            const result = await editImage(
                originalImage.base64, 
                originalImage.file.type, 
                scenePrompt, 
                profile, 
                { hairStyle, aspectRatio, makeupLook, skinTexture, eyeColor }
            );

            if (result) {
                const newImage = { scene: scenePrompt, image: `data:image/png;base64,${result}`, id: Date.now() + i };
                setGeneratedImages(prev => [newImage, ...prev]);
            }
        }

    } catch (err: any) {
        setError(err.message || 'Something went wrong.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleDownloadAll = async () => {
    if (generatedImages.length === 0) return;
    setIsZipping(true);
    try {
        const zip = new JSZip();
        
        generatedImages.forEach((img, index) => {
            const base64Data = img.image.split(',')[1];
            // Sanitize filename from scene text, limit length
            const safeScene = img.scene.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const filename = `${index+1}_${safeScene}.png`;
            zip.file(filename, base64Data, {base64: true});
        });

        const content = await zip.generateAsync({type: "blob"});
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g, "-");
        link.download = `daily-aesthetics-batch-${dateStr}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to zip images", e);
        setError("Failed to create zip file.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans text-gray-800 pb-20">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-block bg-white/60 px-6 py-2 rounded-full mb-4 shadow-sm backdrop-blur-sm border border-white">
              <span className="text-pink-500 font-bold tracking-widest uppercase text-xs">The Ultimate AI Studio</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400 drop-shadow-sm tracking-tight" style={{fontFamily: 'serif'}}>
            Daily Aesthetics
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Create your flawless AI Twin. Choose from many luxury lifestyle scenes, custom hair, makeup, and aesthetic filters.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: CONTROLS (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Upload Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-pink-100/50 p-6 border border-white">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="bg-pink-200 w-8 h-8 rounded-full flex items-center justify-center text-pink-700 text-sm">1</span>
                        Your Look
                    </h2>
                    <div className="aspect-[3/4] w-full bg-pink-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-pink-200 hover:border-pink-400 transition relative group cursor-pointer">
                        {originalImage ? (
                             <>
                                <img src={originalImage.base64} alt="Original" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <label htmlFor="file-upload-replace" className="bg-white text-pink-600 px-4 py-2 rounded-full text-sm font-bold shadow-lg cursor-pointer">Change Photo</label>
                                </div>
                             </>
                        ) : (
                            <div className="text-center p-6">
                                <UploadIcon className="mx-auto h-12 w-12 text-pink-300 mb-2" />
                                <p className="text-sm font-medium text-gray-500">Tap to Upload</p>
                            </div>
                        )}
                        <input id="file-upload-replace" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        {!originalImage && <label htmlFor="file-upload-replace" className="absolute inset-0 cursor-pointer"></label>}
                    </div>

                    {originalImage && (
                        <button 
                            onClick={handleRemoveBackground}
                            disabled={isLoading}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition"
                        >
                            <ScissorsIcon className="w-4 h-4" />
                            Remove Background
                        </button>
                    )}
                </div>

                {/* Settings Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-100/50 p-6 border border-white">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="bg-blue-200 w-8 h-8 rounded-full flex items-center justify-center text-blue-700 text-sm">2</span>
                        Customize Twin
                    </h2>

                    <div className="space-y-5">
                        {/* Hair */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Hair Style</label>
                            <select 
                                value={hairStyle} 
                                onChange={(e) => setHairStyle(e.target.value)}
                                className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                            >
                                {HAIR_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Makeup */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Makeup Look</label>
                            <select 
                                value={makeupLook} 
                                onChange={(e) => setMakeupLook(e.target.value)}
                                className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                            >
                                {MAKEUP_LOOKS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Skin Texture */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Skin Finish</label>
                            <select 
                                value={skinTexture} 
                                onChange={(e) => setSkinTexture(e.target.value)}
                                className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                            >
                                {SKIN_TEXTURES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                         {/* Eye Color */}
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Eye Color</label>
                            <select 
                                value={eyeColor} 
                                onChange={(e) => setEyeColor(e.target.value)}
                                className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                            >
                                {EYE_COLORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Aspect Ratio</label>
                                <select 
                                    value={aspectRatio} 
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                                >
                                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quantity</label>
                                <select 
                                    value={quantity} 
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full p-3 bg-aesthetic-tan/30 border-none rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-pink-300"
                                >
                                    {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} Image{i > 0 ? 's' : ''}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !originalImage}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 text-white text-lg font-bold shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                         <>Generating...</> 
                    ) : (
                         <><SparklesIcon className="w-5 h-5" /> Generate Twins</>
                    )}
                </button>
                
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center font-medium">{error}</div>}

            </div>

            {/* RIGHT COLUMN: SCENES & GALLERY (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* Scene Selector */}
                <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Choose Your Scenes</h3>
                         <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">500+ Options Available</span>
                    </div>
                    
                    {/* Custom Input */}
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={customScene}
                            onChange={(e) => setCustomScene(e.target.value)}
                            placeholder="Type your own dream scene here..."
                            className="flex-1 p-3 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-pink-300 text-gray-700 placeholder-gray-400"
                        />
                        <button onClick={addCustomScene} className="bg-white text-pink-500 font-bold px-5 rounded-xl shadow-sm hover:bg-pink-50">Add</button>
                    </div>

                    {/* Selected Scenes Tags */}
                    {selectedScenes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-white/50 rounded-2xl border border-white">
                            {selectedScenes.map((scene, i) => (
                                <span key={i} onClick={() => toggleScene(scene)} className="bg-gradient-to-r from-pink-100 to-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer hover:bg-red-100 flex items-center gap-1">
                                    {scene} <span className="text-purple-400 text-[10px]">✕</span>
                                </span>
                            ))}
                             <button onClick={() => setSelectedScenes([])} className="text-xs text-gray-400 underline ml-2">Clear All</button>
                        </div>
                    )}

                    {/* Categories Accordion/List */}
                    <div className="space-y-6 h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {Object.entries(SCENE_CATEGORIES).map(([category, scenes]) => (
                            <div key={category}>
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white/90 backdrop-blur py-2 z-10">{category}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {scenes.map((scene) => (
                                        <button
                                            key={scene}
                                            onClick={() => toggleScene(scene)}
                                            className={`text-left text-xs sm:text-sm p-3 rounded-xl transition-all border ${selectedScenes.includes(scene) ? 'bg-pink-500 text-white border-pink-500 shadow-md transform scale-[1.01]' : 'bg-white text-gray-600 border-transparent hover:bg-pink-50 hover:border-pink-100'}`}
                                        >
                                            {scene}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="bg-white/80 rounded-3xl p-12 text-center animate-pulse">
                        <div className="text-6xl mb-4">✨</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Creating Perfection</h3>
                        <p className="text-pink-500 font-medium">{loadingMessage}</p>
                    </div>
                )}

                {/* Gallery Section Header */}
                <div className="flex items-center justify-between mt-8 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Your Gallery</h3>
                    {generatedImages.length > 0 && (
                        <button 
                            onClick={handleDownloadAll} 
                            disabled={isZipping}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition transform hover:scale-105 disabled:opacity-70"
                        >
                            <ArchiveBoxIcon className="w-5 h-5" />
                            {isZipping ? 'Zipping...' : 'Download All (Zip)'}
                        </button>
                    )}
                </div>

                {/* Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {generatedImages.map((img) => (
                        <div key={img.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                            <img src={img.image} alt={img.scene} className="w-full h-auto object-cover" />
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6 text-white">
                                <p className="font-medium text-sm line-clamp-3">{img.scene}</p>
                                <div className="flex justify-end">
                                    <a href={img.image} download={`daily-aesthetic-${img.id}.png`} className="bg-white/20 backdrop-blur-md p-3 rounded-full hover:bg-white hover:text-pink-600 transition">
                                        <DownloadIcon className="w-6 h-6" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                    {generatedImages.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-20 text-gray-400 bg-white/40 rounded-3xl border-2 border-dashed border-white">
                            <p>Your masterpieces will appear here ✨</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
        
      </main>
      <footer className="w-full text-center py-6 mt-10 text-gray-400 text-sm font-medium border-t border-white/20">
        <p>© 2025 Siderra Davis (The Low Ticket Millionaire) All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default App;