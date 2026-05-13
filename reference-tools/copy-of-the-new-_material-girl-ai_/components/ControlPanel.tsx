import React, { useState } from 'react';
import { AppState, Tab, AspectRatio, IdentityControl, Theme } from '../types';
import { EditIcon, VideoIcon, UserCircleIcon, UsersIcon, UserMinusIcon, ChevronDownIcon } from './icons';

interface ControlPanelProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onImageEdit: () => void;
  onVideoGenerate: () => void;
}

// --- PROMPT ENHANCER DATA ---
const themes = {
    title: 'Theme',
    options: [
        { name: 'Solo', prompt: 'A solo portrait,', theme: 'solo' },
        { name: 'Couple', prompt: 'A stylish couple,', theme: 'couple' },
        { name: 'Mommy & Me', prompt: 'A mother and daughter in matching outfits,', theme: 'mommy' },
        { name: 'Mini Me', prompt: 'A toddler or teenage girl in a high-fashion outfit,', theme: 'mini' },
    ],
    isPrompt: true,
};

const everydayStreetLuxury = {
    title: 'Everyday & Street Luxury',
    options: [
        { name: 'Chanel Street', prompt: 'A Chanel-inspired sweater, crystal chain belt, black leggings, and chunky fashion boots' },
        { name: 'Minimal Power', prompt: 'A black turtleneck, wide-leg leather trousers, and white cat-eye frames' },
        { name: 'Parisian Boss', prompt: 'A gold-piped blazer with a matching mini skirt, sheer tights, knee boots, and a captain cap' },
    ],
    isPrompt: true,
};

const y2kAndBaddieFits = {
    title: 'Y2K & Baddie Fits',
    options: [
        { name: 'Pink Power Suit', prompt: 'A hot pink cropped blazer with structured shoulders, matching high-waisted black shorts, sheer black tights, and black platform heels.' },
        { name: 'Anime Street Style', prompt: 'A long pink trench coat, pink ripped jeans, pink thigh-high boots, and a crop top with an anime girl graphic.' },
        { name: 'Retro Phone Call', prompt: 'A white tie-front blouse, light wash jeans, and pink thigh-high boots, holding a vintage pink telephone handbag.' },
        { name: 'Patchwork Denim', prompt: 'Y2K style patchwork denim wide-leg jeans with a simple navy blue tank top.' },
        { name: 'Puffer Jacket Glam', prompt: 'An oversized black leather puffer jacket with a high collar, black leggings, and thigh-high pointed black boots, on a city rooftop.' },
    ],
    isPrompt: true,
};


const luxuryRedCarpetCouture = {
    title: 'Luxury & Red-Carpet Couture',
    options: [
        { name: 'CEO Chic', prompt: 'A tailored double-breasted black suit with satin lapels, black turtleneck, and pointed pumps' },
        { name: 'Night Luxe', prompt: 'A black mock-neck bodycon top, mini wrap skirt, sheer tights, patent pumps, and fur cuffs' },
        { name: '2011 Grammys', prompt: 'A leopard-print satin Givenchy-inspired gown with matching gloves and a dramatic up-do wig.' },
        { name: 'Met Gala Sculpture', prompt: 'A sculptural cut-out bustier and a long train gown, in a high-fashion, avant-garde style for the Met Gala.' },
        { name: 'Gold Street Luxe', prompt: 'A gold-metallic trench coat, black leather mules, a gold Speedy-inspired bag, and a Chanel-inspired scarf as a head wrap.' },
        { name: 'Pinstripe Suit Dress', prompt: 'A custom pinstripe “suit-dress” with a pencil skirt featuring a mermaid train and a corset top.' },
        { name: 'Pink Friday 2 Tour', prompt: 'A crystal-encrusted red bodysuit and matching tights with red leather boots, a stunning stage look.' },
        { name: 'Floral Ruffle Mini', prompt: 'A ruffled floral mini dress with oversized sleeves, a vibrant belt, and knee-high boots.' },
        { name: 'Pastel Gown', prompt: 'A voluminous pastel pink gown with platform shoes and a bubble-style silhouette.' },
        { name: 'Red Carpet White Lace', prompt: 'An all-white lace gown with sleek hair, looking demure but bold.' },
        { name: 'Metallic Floral Art', prompt: 'A metallic mini dress covered in 3D hand-painted flowers, paired with floral shoes, a walking art piece.' },
        { name: 'White Fur & Studs', prompt: 'A high-fashion look featuring a white fur jacket with intricately studded and textured white leather sleeves, with long, sleek black hair.' },
        { name: 'Satin Dream', prompt: 'A dreamy, soft-focus portrait in a bedroom with pink satin sheets, holding a vintage pink telephone, with pearl jewelry and hair clips.' },
        { name: 'Pink Friday Art', prompt: 'An ethereal, futuristic look inspired by the Pink Friday 2 album art, featuring a dramatic white oversized robe or coat, a unique headpiece, and two-tone pink and white hair, set against a surreal sky backdrop.' },
        { name: 'Sleek Satin Gown', prompt: 'An elegant, minimalist portrait in a cream-colored satin gown with a cowl neck, showcasing a sophisticated and poised look.' },
        { name: 'Neon Pink Haze', prompt: 'A surreal portrait bathed in neon pink and purple light, with long, wavy pastel hair, creating a dreamy and otherworldly vibe.' },
        { name: 'Anaconda Vibe', prompt: 'A powerful and edgy portrait with a bold, dark aesthetic, featuring a thick diamond choker and a large snake draped over the shoulders.' },
        { name: 'White Fur Cuffs', prompt: 'A chic and minimalist studio portrait in a black mock-neck top and wrap skirt, accented with dramatic white faux-fur cuffs.' },
    ],
    isPrompt: true,
};

const bossBabePresets = {
    title: "Boss Babe Affirmations",
    options: [
        { name: 'Becoming That Woman', prompt: 'A luxurious, moody shot focusing on gold jewelry and glossy lips, with the text "Becoming That Woman" in elegant script.' },
        { name: 'Building My Empire', prompt: 'An artistic illustration of a boss woman in a power suit and glasses, sitting in front of a luxury car with a city skyline, with the text "Just a girl boss building her empire."' },
        { name: 'Glow and Pray', prompt: 'A soft, feminine scene with pink peonies, beauty products, and an inspirational "Godfidence" reminder to pray, glow, and let God handle the rest.' },
        { name: 'I Choose Myself', prompt: 'An empowering illustration of a woman in a lavender dress with text overlay: "I choose myself Daily: by taking brave steps..."' },
    ],
    isPrompt: true,
};


const lifestyleAndVibePresets = {
    title: "Lifestyle & Vibe",
    options: [
        { name: 'Pink G-Wagon Glam', prompt: 'Sitting in the passenger seat of a luxury G-Wagon with a pink suede interior, looking glamorous.' },
        { name: 'Pink Rolls Royce', prompt: 'Posing with a custom pink Rolls Royce, looking like royalty.' },
        { name: 'Black Lamborghini', prompt: 'Stepping out of a sleek, matte black Lamborghini at night.' },
        { name: 'White Ferrari', prompt: 'Leaning against a white Ferrari in a scenic, luxurious location.' },
        { name: 'Matching G-Wagons', prompt: 'A power couple posing with two matching G-Wagons, one black and one white.' },
        { name: 'Baddie Athleisure', prompt: 'A confident baddie in high-end athleisure, wearing a Nike or Bape-inspired outfit with perfect hair and makeup.' },
        { name: 'Maybach Money', prompt: 'Posing in front of a sleek, silver Maybach, wearing distressed jeans and a stylish crop top.' },
        { name: 'Red Rose Photoshoot', prompt: 'An artistic, romantic portrait surrounded by a wall of red roses.' },
        { name: 'Night Out', prompt: 'Dressed for a night out in a vibrant, multi-colored knit two-piece set, standing by a luxury black SUV.' },
    ],
    isPrompt: true,
};

const haulPresets = {
    title: "Big Brand Hauls",
    options: [
        { name: 'Target Finds', prompt: 'Modeling a trendy and affordable outfit haul from Target, looking chic and stylish.' },
        { name: 'Walmart Glam', prompt: 'Showing off a surprisingly glamorous and fashionable outfit haul from Walmart.' },
        { name: 'Macy\'s Style', prompt: 'A sophisticated outfit haul from Macy\'s, featuring contemporary brands and classic pieces.' },
        { name: 'Nordstrom Luxe', prompt: 'An upscale, luxury fashion haul from Nordstrom, showcasing designer pieces.' },
    ],
    isPrompt: true,
};

const couplePresets = {
    title: "Couple Styles",
    options: [
        { name: 'Gala Night', prompt: 'A couple at a black-tie gala, him in a sharp tuxedo, her in an elegant evening gown.' },
        { name: 'City Stroll', prompt: 'A stylish couple walking hand-in-hand down a city street in coordinated trench coats.' },
        { name: 'Rooftop Sunset', prompt: 'A romantic couple embracing on a rooftop at sunset, with a warm, golden hour glow.' },
        { name: 'Cafe Date', prompt: 'An intimate photo of a couple sharing a coffee at a chic, modern cafe.' },
        { name: 'Luxe Lounge', prompt: 'A power couple posing in a luxurious hotel lounge, dressed in designer outfits.' },
    ],
    isPrompt: true,
};

const mommyAndMePresets = {
    title: "Mommy & Me Outfits",
    options: [
        { name: 'Matching Tweed', prompt: 'A mother and daughter in matching pink tweed jackets and white dresses.' },
        { name: 'Denim Duo', prompt: 'A mother and daughter in stylish matching denim jackets, black leggings, and white sneakers.' },
        { name: 'Boho Queens', prompt: 'A mother and daughter in flowing, matching floral maxi dresses.' },
        { name: 'Leather & Lace', prompt: 'A mother in a chic leather jacket, with her daughter in a complementary lace dress.' },
        { name: 'Holiday Glam', prompt: 'A mother and daughter in sparkling, matching red velvet dresses for a holiday event.' },
    ],
    isPrompt: true,
};

const miniMePresets = {
    title: "Mini Me Styles (Toddler & Teen)",
    options: [
        { name: 'Toddler Chic', prompt: 'A toddler girl in a miniature tweed jacket, pleated skirt, and tiny fashion sneakers.' },
        { name: 'Teen Trendsetter', prompt: 'A teenager in a stylish cropped hoodie, wide-leg jeans, and chunky platform sneakers.' },
        { name: 'Little Ballerina', prompt: 'A toddler girl in a pink tutu dress with a sparkling tiara.' },
        { name: 'Teen E-Girl', prompt: 'A teenager with a layered e-girl aesthetic, striped long-sleeve under a band t-shirt, and combat boots.' },
        { name: 'Mini Influencer', prompt: 'A toddler girl in a designer-inspired sweatsuit with a tiny handbag.' },
    ],
    isPrompt: true,
};


// --- NON-OUTFIT PRESETS ---

const shotTypes = {
    title: 'Shot Type & Storyboard',
    options: [
        { name: 'Headshot', prompt: 'a detailed, ultra-realistic headshot portrait' },
        { name: 'Upper Body', prompt: 'an upper body photoshoot' },
        { name: 'Mid-shot', prompt: 'a mid-shot from the waist up' },
        { name: 'Cowboy Shot', prompt: 'a cowboy shot from mid-thigh up' },
        { name: 'Full Body', prompt: 'a full body fashion shot' },
        { name: 'Outfit Detail Shot', prompt: 'a detailed close-up shot focusing on the outfit\'s texture and details (e.g., jacket, dress)' },
        { name: 'Accessory Close-Up', prompt: 'a close-up shot focusing on the accessories, like the handbag and jewelry' },
        { name: 'Hair & Makeup Close-Up', prompt: 'a beauty shot focusing on the hair and makeup details' },
        { name: 'Shoe Cam', prompt: 'a close-up shot focused on the footwear' },
    ],
    isPrompt: true,
};

const bodyTypes = {
    title: 'Body Type',
    options: ['curvy body shape', 'voluptuous figure', 'slim thick body type', 'athletic build'],
    isPrompt: false, 
};

const designerAesthetics = {
    title: 'Designer Aesthetics',
    options: ['Fendi', 'Gucci', 'Prada', 'Chanel', 'Dior', 'Balmain', 'Versace', 'Bottega', 'YSL', 'Hermès', 'Givenchy', 'Miu Miu', 'Off-White']
};

const skinUndertones = {
    title: 'Skin Undertone',
    options: ['golden undertone', 'olive undertone', 'neutral undertone', 'cool undertone', 'red undertone', 'peach undertone']
};

const skinTones = {
    title: 'Skin Tone',
    options: ['porcelain skin', 'beige skin', 'honey skin', 'caramel skin', 'mocha skin', 'espresso skin', 'ebony skin']
};

const skinRealismFeatures = {
    title: 'Skin Realism Features',
    options: ['visible pores', 'peach fuzz', 'micro-speculars', 'ultra-realistic skin texture', 'dewy skin finish', 'matte skin finish']
};

const materialsAndMotifs = {
    title: 'Materials & Motifs',
    options: ['silk', 'leather', 'tweed', 'sequins', 'bouclé', 'cashmere', 'denim', 'satin', 'wool', 'latex', 'organza', 'quilted', 'houndstooth', 'jacquard', 'shearling', 'faux fur']
};

const hairStyles = { title: 'Hair Style', options: ['Silk Press', 'Hollywood Waves', 'Sleek High Bun', 'Long Braided Ponytail', 'High Ponytail', 'Sleek Bob', 'Wavy Bob with Bangs', 'Half-up Half-down', '4C Coils', 'Jet Black Gloss']};

const baddieHairstyles = {
    title: 'Baddie & Classy Hairstyles',
    options: [
        { name: 'Classy Baddie Blowout', prompt: 'A long, voluminous blowout with face-framing layers.' },
        { name: 'Sleek Braided Updo', prompt: 'Slicked-back hair into multiple intricate buns or knots.' },
        { name: 'High Half-Up Waves', prompt: 'A high half-up ponytail with long, deep waves.' },
        { name: 'Boho Braids', prompt: 'Jumbo knotless box braids with curly ends.' },
        { name: 'Edged & Braided', prompt: 'Sleek straight hair with two small, thin braids framing the face, with styled baby hairs and gold hair cuffs.' },
        { name: 'Fluffy 90s Updo', prompt: 'A fluffy, voluminous 90s-style updo with curtain bangs.' },
    ],
    isPrompt: true,
};

const makeupLooks = {
    title: 'Makeup Look',
    options: [
      'Soft-glam neutral tones – dewy skin, nude lip gloss, peach blush',
      'HD glam matte foundation – airbrushed contour, bright under-eye, shimmer lids',
      'Full-face beat – baking technique, dramatic highlight, over-lined lips',
      'No-makeup makeup – skin-tint base, natural lashes, clear gloss',
      'Golden-hour glam – bronze eyes, gold highlight, warm undertones',
      'Rosé flush – pink blush drape, glossy pink lips',
      'Business-meeting beat – soft brown matte eyeshadow, nude matte lip, light contour',
      'Corporate soft glam – mauve tones, precise liner, satin finish',
      'Red-carpet radiance – champagne shimmer eyes, full glow, berry lips',
      'Editorial metallic – chrome lids, glass-skin foundation',
      'Cat-eye classic – winged liner, baby-doll lashes, pink-nude lip',
      '90s supermodel – brown lip liner, nude gloss, bronzed cheek',
      'Barbiecore pink – cotton-candy blush, pink shimmer lids',
      'Snow-glow – icy highlight, frosted lip gloss',
      'Bronze goddess – warm contour, gold foil shadow',
      'Strawberry milk – dewy pink tones, flushed nose',
      'Latte makeup – caramel tones, glossy brown lip',
      'Cinnamon spice – burnt-orange shimmer lids',
      'Soft beat for work – tinted moisturizer, light mascara',
      'Clean-girl glow – soap brows, cream blush, lip balm sheen',
      'Matte beat – powder set, sculpted cheekbones',
      'Dewy glass-skin – hydrated base, balm highlight',
      'Wedding-day glam – subtle shimmer, nude liner, natural lash',
      'Holiday glam – gold glitter lids, red lip',
      'Christmas couture – ruby shimmer, pearlescent highlight',
      'Angelic glow – silver shimmer lids, soft coral lips',
      'Vintage pin-up – matte red lip, black wing liner',
      'Soft-brown glam – taupe shadow, glossy lip',
      'Peach sorbet – pastel eyeshadow, coral lip',
      'Mauve moment – cool-tone blush, glossy mauve lips',
      'Smoked-out glam – charcoal shadow, glossy nude lip',
      'Reverse cat eye – smoke under lash line',
      'Bold editorial color pop – electric blue liner, gloss skin',
      'Copper glam – metallic copper lids, brown-nude lip',
      'Champagne glow – highlight-heavy, pink gloss',
      'Glow-from-within – luminous base, minimal powder',
      'Bronze-foil – high-shine lid, gold inner-corner',
      'Candlelight glam – warm lowlight, golden finish',
      'Blushing bride – rose-tone lid, glossy peach lip',
      'Date-night beat – smoky brown eyes, glossy pout',
      'Chocolate glam – rich brown shadows, cocoa gloss',
      'Natural nude – skin-matching blush, balm lip',
      'Matte bronze – flat warm tones, velvet finish',
      'Metallic rose – rose-gold lids, pink gloss',
      'Autumn leaf – orange-brown shimmer blend',
      'Pumpkin spice glam – rust lid, burnt lip',
      'Mocha glam – espresso liner, glossy mocha lip',
      'Glossy-eye editorial – wet look shadow',
      'Rainbow glam – multi-color liner',
      'Graphic liner art – white wing, nude lip',
      'Sunset glam – orange, gold, pink gradient',
      'Glitter bomb – chunky gold glitter',
      'Neon pop – hot-pink or lime lid',
      'Galaxy glam – iridescent pigments',
      'Mermaid glow – aqua shimmer',
      'Ice-princess glam – frosted silver tones',
      'Summer glow – bronze body highlight',
      'Beach babe – minimal, salty sheen',
      'Vacation soft beat – tinted moisturizer',
      'Club-night full glam – dramatic contour',
      'Festival glitter glam',
      'Birthday beat – extra highlight',
      'Baddie glam – matte full coverage',
      'Instagram-filter look',
      'Soft-focus HD beat',
      'Bridal luxury glow',
      'Boss-babe glam',
      'Red-lip classic',
      'Nude lip obsession',
      'Cut-crease glam',
      'Halo-eye shimmer',
      'Smoky purple eye',
      'Emerald green metallic',
      'Sapphire blue smoke',
      'Peach-nude perfection',
      'Glass-skin runway',
      'Highlight bomb',
      'Subtle bronze',
      'Pink-champagne glam',
      'Lilac glow',
      'Rose-gold flush',
      'Coral bliss',
      'Apricot shine',
      'Honey-drip glam',
      'Caramel latte look',
      'Chestnut beat',
      'Maple-tone fall makeup',
      'Cocoa-butter finish',
      'Creamy ivory glow',
      'Toffee glam',
      'Golden-chestnut beat',
      'Matte honey finish',
      'Dewy rose skin',
      'Cinnamon-swirl glam',
      'Champagne-to-bronze blend',
      'HD studio beat',
      'Camera-ready matte',
      'Soft contour sculpt',
      'Bold cheek blush drape',
      'Barbie holiday glam',
      'Winter wonderland look',
      'Snow-kissed glam',
      'Red-velvet Christmas look',
      'Candy-cane liner detail',
      'Gold-leaf holiday beat',
      'Frosted cranberry glow',
      'Evergreen eye makeup',
      'Santa-baby red lip',
      'G-Wagon glam (boss energy, HD beat)',
      'Business-luxe soft glam',
      'Glam for Zoom calls',
      'Photoshoot-ready beat',
      'Glam under LED light',
      'Golden-studio beat',
      'Red-carpet HD finish',
      'Magazine-cover look',
      'Makeup-for-men neutral',
      'No-flashback matte',
      'Long-wear bride glow',
      'Editorial drama cut-crease',
      'Couture runway beat',
      'Winter holiday party glam',
      'Bronze-holiday look',
      'Gift-wrapped glam',
      'Frosty-finish glow',
      'Ice-queen eye',
      'Nude-pink office look',
      'Champagne-holiday finish',
      'Gold-star night glam',
      'Christmas-Eve soft beat',
      'Holiday family glow',
      'Christmas-morning natural',
      'Sleigh-ride sparkle',
      'Reindeer-brown smoke',
      'Evergreen-liner look',
      'Polar-bear pearl finish',
      'Candy-cane lashes edit',
      'North-pole highlight',
      'New-Year’s Eve silver glam',
      'Countdown gold beat',
      'Fireworks sparkle look',
      '12 AM glow',
      'Confetti shimmer eye',
      'Champagne-toast highlight',
      'Glitter-lip moment',
      'Resolution-ready beat',
      'Winter soft-glow beat',
      'January-renewal look',
      'Frost-kissed nude',
      'Cozy-indoor beat'
    ],
};
  
const lashStyles = {
    title: 'Detailed Lash Styles',
    options: [
      'Natural mink lashes – short, wispy ends',
      '16 mm baby-doll lashes',
      '18 mm flutter set',
      '20 mm soft-volume',
      '22 mm glam curl',
      '25 mm baddie lash',
      '27 mm super drama',
      'Double-stacked mink',
      'Hybrid classic-volume mix',
      'Cat-eye mapping',
      'Doll-eye mapping',
      'Fox-eye style',
      'Wispy clusters',
      'Fluffy Russian volume',
      'Mega-volume fans',
      'Light-volume sets',
      'Wet-lash look',
      'Kim K spiked style',
      'Soft-classic C-curl',
      'D-curl volume set',
      'L-curl lifted outer corner',
      'Round-eye design',
      'Natural open eye',
      'Glamorous tapered set',
      'Feather light lash',
      'Bottom-lash enhancement',
      'Lower-lash clusters',
      'Ultra-curl set',
      '3D mink lashes',
      '5D mink lashes',
      'Faux mink vegan set',
      'Magnetic lash pair',
      'Strip lash matte band',
      'Clear-band wispy',
      'Black-band glam lash',
      'Corner-accent lashes',
      'Half-lash look',
      'Custom lash mapping',
      'Colored lash tips',
      'Ombre pink lashes',
      'Blue lash ends',
      'Glitter accent lashes',
      'Rhinestone lash line',
      'Winged lash effect',
      'Spiky outer corner',
      'Mixed length volume',
      'Lash-lift look',
      'Mascara-coated effect',
      'Classic single extensions',
      'Hybrid half set',
      'Dense full set',
      'Flared outer corner',
      'Catwalk lash look',
      'Editorial lash art',
      'Festival lashes',
      'Metallic lash finish',
      'Gold-tipped lashes',
      'Silver-foil lashes',
      'Glitter-dust lashes',
      'Red-holiday lashes',
      'Green holiday tips',
      'Snow-white lashes',
      'Candy-cane pattern',
      'Winter glam lashes',
      'Frosted tips set',
      'Sleigh-ride lashes',
      'North-star spike set',
      'Cranberry tint lashes',
      'Icy-blue ends',
      'Champagne lash shine',
      'Velvet black luxury set',
      'Matte jet black set',
      'Glossy finish lash',
      'Volume hybrid cat-eye',
      'Classic C curl medium length',
      'Hybrid mix DD curl',
      'Dramatic baddie fan',
      'Wispy natural fan',
      'HD lash extensions',
      'Soft-glam set',
      'Full-beat lash stack',
      'Business-glam lashes',
      'Everyday neutral lash',
      'Editorial length set',
      'Bridal natural set',
      'Date-night fluff',
      'Camera-ready lash',
      'Red-carpet volume',
      'Couture lash fan',
      'Studio HD curl',
      'Soft beat short lash',
      'Holiday tinsel lash',
      'Sparkle lash strip',
      'Diamond lash band',
      'Mink XL set',
      '3D Curl Fusion set',
      'Black velvet lash',
      'Butter-soft mink fans',
      'Super-fine classic set',
      'Wispy baby lashes'
    ],
};

const accessories = { title: 'Accessories', options: ['Oversized Sunglasses', 'Layered Gold Chains', 'Quilted Mini Bag', 'Crystal Belt', 'Pearl Necklace', 'Box Clutch', 'Futuristic Gold Shades', 'Holding a Vogue magazine']};
const jewelry = {
    title: 'Jewelry',
    options: ['large gold hoops', 'diamond stud earrings', 'layered gold chain necklaces', 'a silver cross choker', 'silver bangle bracelets', 'a diamond tennis necklace', 'pearl drop earrings'],
};
const scenes = { title: 'Scene & Lighting', options: ['Marble Lobby', 'Boutique Elevator', 'Penthouse Hallway', 'City at Night', 'Studio Backdrop', 'Golden Hour Lighting', 'Chic Bakery', 'Holding a wine glass in a lounge', 'Candid laugh with wine', 'Cheers-ing with champagne']};
const editorialFinish = {
    title: 'Editorial Finish',
    options: ['cinematic lighting', 'shallow depth of field', 'magazine-quality finish', 'soft glam lighting', 'filmic contrast', 'high-end color grading'],
};

const detailedHairStyles = {
    title: 'Detailed Hair Styles',
    options: [
        'Long waist-length Brazilian body wave with side part',
        '40-inch Burmese straight hair with HD lace closure',
        'Indian deep wave with middle part and glossy sheen',
        'Honey blonde balayage with bouncy curls',
        'Jet black silky press with baby hairs',
        'Platinum blonde bob, asymmetrical cut',
        'Burgundy ombré 28-inch wavy layers',
        'Burmese curly 30-inch frontal install',
        'Soft brown chestnut highlights, natural curls',
        'Kinky straight 4C-textured ponytail',
        'Sleek low bun with side swoop',
        'Deep wave lace front wig, 13x4 frontal',
        'Half-up, half-down barrel curls, HD transparent lace',
        'Waist-length bone straight jet black, 5x5 closure',
        'Cinnamon copper loose curls',
        'High braided ponytail with gold string accents',
        '613 platinum frontal with melted roots',
        'Burmese deep curly with 200% density',
        'Brazilian water wave 30-inch install',
        'Beach wave 26-inch soft glam look',
        'Wavy layered bob with curtain bangs',
        'Short pixie cut with finger waves',
        'Voluminous Afro puff with slick edges',
        'Faux locs with golden cuffs',
        'Goddess braids with curly ends',
        'Lemonade braids with zigzag parts',
        'Long jumbo knotless braids',
        'Bohemian box braids with wavy ends',
        'Shoulder-length curly crochet style',
        'Full kinky curly afro',
        'Bantu knots with coily pattern',
        'Burgundy passion twists',
        'Half-up bun with loose curls down back',
        'Long side braid with baby hairs',
        'Burmese curly bob',
        'Brazilian loose wave ponytail',
        'Burmese wet & wavy frontal install',
        'Half-up space buns with tendrils',
        '30-inch sleek ponytail',
        'Low bun with pearl accessories',
        'Long crimped hair with glossy finish',
        'Sleek straight hair with two face-framing strands',
        'Black-to-red ombré',
        'Deep curly middle-part unit',
        'Blonde highlight streaks in dark brown base',
        'Burmese kinky curly texture',
        'Natural blowout volume style',
        'Long layered cut with swoop bangs',
        'Burmese wavy wig, wet look finish',
        'Soft glam side ponytail',
        'Burgundy bob with fringe',
        'Chocolate brown layered hair',
        'Brazilian straight with blunt cut ends',
        'Burmese loose deep curls',
        'Auburn highlights with soft curls',
        'Red wine-colored curls',
        'Long wavy ponytail with baby hairs',
        'Boho goddess locs',
        'Honey blonde frontal with HD melt',
        'Jet black half-up bun',
        'Natural afro with headband',
        'Burmese wet wave',
        'Long kinky straight with texture',
        'Sleek low braid bun',
        'Indian remy silky press',
        'Curly side part with volume',
        'Burmese tight curls',
        'Deep wave middle part',
        'Burmese straight closure unit',
        'Ombre brown to blonde loose waves',
        'Layered frontal with soft curls',
        'Copper red blowout',
        'Sleek bob with middle part',
        'Burmese full wave unit',
        'Low braided bun',
        'High puff afro',
        '28-inch straight weave install',
        'Burmese full deep curly frontal',
        'Indian wavy lace front',
        'Platinum blonde long curls',
        'Black silky 30-inch ponytail',
        'Natural curls with baby hairs',
        'Curly half ponytail',
        'Auburn bob with side part',
        'Deep curly 13x6 frontal',
        'Brazilian straight 40-inch unit',
        'Loose wave with highlights',
        'Burmese full wavy look',
        'High bun with accessories',
        'Curly bangs bob',
        'Burmese straight blunt cut',
        'Deep wave wig with 180% density',
        'Red ombré beach curls',
        'Burmese natural wave',
        'Kinky straight ponytail',
        'Indian curly layered look',
        'Wet wave deep curls',
        'Blonde layered waves',
        'Chocolate bob cut',
        'Natural afro curls',
        'Short curly pixie cut',
        'Burmese bouncy curls',
        '30-inch straight press',
        'Burmese frontal wavy install',
        'Long side swoop ponytail',
        'Crimped long waves',
        'Layered frontal unit',
        'Burmese loose curls',
        'Jet black body wave',
        'Soft brown straight unit',
        'Platinum straight wig',
        'Burmese middle part curls',
        'Deep curly side part',
        'Auburn layered waves',
        'Long Burmese wavy install',
        'Loose curls with baby hairs',
        'Side bun updo',
        'Deep wave ponytail',
        'Long braided crown',
        'Burmese crimped waves',
        'Kinky twist bob',
        'Shoulder-length natural curls',
        'Burmese full volume curls',
        'Sleek double braids',
        'Platinum waves',
        'Copper curly bob',
        'Burmese layered curls',
        'Jet black natural press',
        'Bohemian twist braids',
        'Loose curls updo',
        'Burmese high ponytail',
        '613 blonde soft waves',
        'Burmese wet wave long',
        'Low curly bun',
        'Layered blowout style',
        'Burmese soft curls',
        'Deep curl ponytail',
        'Sleek black lob',
        'Wet look deep curls',
        'Burmese soft press',
        '40-inch silky straight hair',
        'Soft brown balayage curls',
        'Burmese beach wave curls',
        'Auburn natural blowout',
        'Long twist-out',
        'Burmese wavy lace front',
        'Straight bob with bangs',
        'Honey brown waves',
        'Burmese silky wave install',
        'Deep curly high ponytail',
    ]
};


// --- REUSABLE COMPONENTS ---

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-800">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-3 px-1 text-left">
                <h3 className="text-lg font-fancy font-bold text-pink-400">{title}</h3>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-4 px-1">{children}</div>}
        </div>
    );
};


const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-t-lg transition-all duration-300 ${
      isActive
        ? 'bg-gray-900/60 text-pink-400 border-b-2 border-pink-400'
        : 'bg-black/30 text-gray-400 hover:bg-gray-900/50'
    }`}
  >
    {icon}
    {label}
  </button>
);

const AspectRatioButton: React.FC<{
    value: AspectRatio,
    label: string,
    currentValue: AspectRatio,
    onClick: (value: AspectRatio) => void,
}> = ({ value, label, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`flex-1 py-2 px-4 text-xs font-semibold rounded-md transition-colors duration-200 ${
            currentValue === value ? 'bg-pink-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const BatchSizeSelector: React.FC<{
    currentSize: number;
    onChange: (size: number) => void;
    disabled: boolean;
}> = ({ currentSize, onChange, disabled }) => {
    const sizes = [1, 2, 4];
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Batch Size</h3>
            <div className="flex gap-2">
                {sizes.map(size => (
                    <button
                        key={size}
                        onClick={() => onChange(size)}
                        disabled={disabled}
                        className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-colors duration-200 ${
                            currentSize === size ? 'bg-pink-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {size} Image{size > 1 ? 's' : ''}
                    </button>
                ))}
            </div>
        </div>
    );
};

const PresetGroup: React.FC<{
    options: (string | {name: string, prompt: string})[];
    onClick: (value: string) => void;
    disabled: boolean;
    isPrompt?: boolean;
}> = ({ options, onClick, disabled, isPrompt = false }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={typeof option === 'string' ? option : option.name}
          onClick={() => onClick(isPrompt ? (option as {name: string, prompt: string}).prompt : (option as string))}
          disabled={disabled}
          className="px-3 py-1 text-sm bg-gray-800 text-gray-200 rounded-full hover:bg-pink-500/80 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed capitalize"
        >
          {isPrompt ? (option as {name: string, prompt: string}).name : `+ ${option}`}
        </button>
      ))}
    </div>
);

const ThemeSelector: React.FC<{
    currentTheme: Theme;
    onThemeChange: (theme: Theme, prompt: string) => void;
    disabled: boolean;
}> = ({ currentTheme, onThemeChange, disabled }) => (
    <div className="p-1">
        <h3 className="text-lg font-fancy font-bold text-pink-400 mb-3">{themes.title}</h3>
        <div className="flex flex-wrap gap-2">
            {themes.options.map(({ name, prompt, theme }) => (
                <button
                    key={name}
                    onClick={() => onThemeChange(theme, prompt)}
                    disabled={disabled}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                        currentTheme === theme ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-pink-500/80'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {name}
                </button>
            ))}
        </div>
    </div>
);


const IdentityControlComponent: React.FC<{
    currentValue: IdentityControl;
    onChange: (value: IdentityControl) => void;
    disabled: boolean;
}> = ({ currentValue, onChange, disabled }) => {
    const options: { value: IdentityControl; label: string; icon: React.ReactNode, description: string }[] = [
        { value: 'exact', label: 'Create AI Twin', icon: <UserCircleIcon className="w-5 h-5"/>, description: 'Keeps your exact identity.' },
        { value: 'inspired', label: 'AI Inspired', icon: <UsersIcon className="w-5 h-5" />, description: 'New face, inspired by you.' },
        { value: 'none', label: 'Creative Mode', icon: <UserMinusIcon className="w-5 h-5" />, description: 'Ignores the reference face.' },
    ];
    return (
        <div>
            <div className="grid grid-cols-3 gap-2">
            {options.map(({ value, label, icon, description }) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    disabled={disabled}
                    className={`flex flex-col items-center justify-center p-2 text-center rounded-lg transition-all duration-200 border-2 ${
                        currentValue === value 
                        ? 'bg-pink-500/20 border-pink-500 text-white' 
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {icon}
                    <span className="text-xs font-semibold mt-1">{label}</span>
                     <span className="text-[10px] text-gray-400">{description}</span>
                </button>
            ))}
            </div>
        </div>
    );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ appState, setAppState, onImageEdit, onVideoGenerate }) => {
  const { activeTab, prompt, videoPrompt, aspectRatio, isLoading, identityControl, theme, originalImages, batchSize } = appState;

  const handleTabChange = (tab: Tab) => {
    setAppState(prev => ({...prev, activeTab: tab}));
  };

  const handleAddEnhancer = (enhancer: string) => {
    const key = activeTab === 'edit' ? 'prompt' : 'videoPrompt';
    setAppState(prev => ({
      ...prev,
      [key]: prev[key] ? `${prev[key]}, ${enhancer}` : enhancer
    }));
  };
  
  const handleSetPrompt = (newPrompt: string) => {
    const key = activeTab === 'edit' ? 'prompt' : 'videoPrompt';
     setAppState(prev => ({ ...prev, [key]: newPrompt }));
  }
  
  const handleThemeChange = (newTheme: Theme, newPrompt: string) => {
      const key = activeTab === 'edit' ? 'prompt' : 'videoPrompt';
      setAppState(prev => ({...prev, theme: newTheme, [key]: newPrompt }));
  }


  const renderPromptEnhancers = () => (
    <div className="flex flex-col gap-1 mt-4 border-t border-gray-800 pt-4">
        <h3 className="text-xl font-fancy text-center text-gray-300 mb-2">Prompt Enhancers</h3>
        <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} disabled={isLoading} />
        
        {theme === 'solo' && (
             <>
                <Accordion title={everydayStreetLuxury.title}><PresetGroup {...everydayStreetLuxury} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>
                <Accordion title={y2kAndBaddieFits.title}><PresetGroup {...y2kAndBaddieFits} onClick={handleSetPrompt} disabled={isLoading} isPrompt/></Accordion>
                <Accordion title={luxuryRedCarpetCouture.title}><PresetGroup {...luxuryRedCarpetCouture} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>
                <Accordion title={bossBabePresets.title}><PresetGroup {...bossBabePresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>
                <Accordion title={lifestyleAndVibePresets.title}><PresetGroup {...lifestyleAndVibePresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>
                <Accordion title={haulPresets.title}><PresetGroup {...haulPresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>
            </>
        )}
        {theme === 'couple' && <Accordion title={couplePresets.title}><PresetGroup {...couplePresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt /></Accordion>}
        {theme === 'mommy' && <Accordion title={mommyAndMePresets.title}><PresetGroup {...mommyAndMePresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt/></Accordion>}
        {theme === 'mini' && <Accordion title={miniMePresets.title}><PresetGroup {...miniMePresets} onClick={handleSetPrompt} disabled={isLoading} isPrompt/></Accordion>}

        <Accordion title={shotTypes.title}><PresetGroup {...shotTypes} onClick={handleAddEnhancer} disabled={isLoading} isPrompt/></Accordion>
        <Accordion title={bodyTypes.title}><PresetGroup {...bodyTypes} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={designerAesthetics.title}><PresetGroup {...designerAesthetics} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={skinTones.title}><PresetGroup {...skinTones} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={skinUndertones.title}><PresetGroup {...skinUndertones} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={skinRealismFeatures.title}><PresetGroup {...skinRealismFeatures} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={hairStyles.title}><PresetGroup {...hairStyles} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={baddieHairstyles.title}><PresetGroup {...baddieHairstyles} onClick={handleSetPrompt} disabled={isLoading} isPrompt/></Accordion>
        <Accordion title={detailedHairStyles.title}><PresetGroup {...detailedHairStyles} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={makeupLooks.title}><PresetGroup {...makeupLooks} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={lashStyles.title}><PresetGroup {...lashStyles} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={accessories.title}><PresetGroup {...accessories} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={jewelry.title}><PresetGroup {...jewelry} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={scenes.title}><PresetGroup {...scenes} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={materialsAndMotifs.title}><PresetGroup {...materialsAndMotifs} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
        <Accordion title={editorialFinish.title}><PresetGroup {...editorialFinish} onClick={handleAddEnhancer} disabled={isLoading} /></Accordion>
    </div>
  );
  
  const renderIdentityControl = () => (
    <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-fancy font-bold text-pink-400 text-center">Enter the Twinverse</h2>
        <p className="text-center text-gray-400 text-sm -mt-2 mb-2">Choose how the AI uses your photo's identity.</p>
        <IdentityControlComponent 
            currentValue={identityControl}
            onChange={(value) => setAppState(prev => ({ ...prev, identityControl: value }))}
            disabled={isLoading}
        />
    </div>
  );

  return (
    <div className="relative bg-black/20 rounded-2xl max-h-[calc(100vh-10rem)] overflow-y-auto">
       <fieldset disabled={originalImages.length === 0} className="group">
        <div className="sticky top-0 bg-black/50 backdrop-blur-sm z-10 group-disabled:cursor-not-allowed">
            <div className="flex">
            <TabButton label="Edit Image" icon={<EditIcon />} isActive={activeTab === 'edit'} onClick={() => handleTabChange('edit')} />
            <TabButton label="Generate Video" icon={<VideoIcon />} isActive={activeTab === 'video'} onClick={() => handleTabChange('video')} />
            </div>
        </div>

        <div className="p-6">
            {activeTab === 'edit' ? (
            <div className="flex flex-col gap-4">
                {renderIdentityControl()}
                <textarea
                value={prompt}
                onChange={(e) => setAppState(prev => ({...prev, prompt: e.target.value}))}
                placeholder="Describe your vision... e.g., 'A tailored double-breasted black suit with satin lapels, black turtleneck, and pointed pumps'"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-200 resize-none h-28"
                disabled={isLoading}
                />
                 <BatchSizeSelector 
                    currentSize={batchSize} 
                    onChange={(size) => setAppState(prev => ({...prev, batchSize: size}))} 
                    disabled={isLoading} 
                />
                <button
                onClick={onImageEdit}
                disabled={isLoading || !prompt.trim()}
                className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                Apply Edits
                </button>
                {renderPromptEnhancers()}
            </div>
            ) : (
            <div className="flex flex-col gap-4">
                {renderIdentityControl()}
                <textarea
                value={videoPrompt}
                onChange={(e) => setAppState(prev => ({...prev, videoPrompt: e.target.value}))}
                placeholder="Describe the action... e.g., 'Slowly walking towards the camera', 'A gentle breeze blowing through her hair'"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-200 resize-none h-28"
                disabled={isLoading}
                />
                
                <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Aspect Ratio</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <AspectRatioButton value="16:9" label="16:9" currentValue={aspectRatio} onClick={(v) => setAppState(prev => ({...prev, aspectRatio: v}))} />
                        <AspectRatioButton value="9:16" label="9:16" currentValue={aspectRatio} onClick={(v) => setAppState(prev => ({...prev, aspectRatio: v}))} />
                        <AspectRatioButton value="4:3" label="4:3" currentValue={aspectRatio} onClick={(v) => setAppState(prev => ({...prev, aspectRatio: v}))} />
                        <AspectRatioButton value="3:4" label="3:4" currentValue={aspectRatio} onClick={(v) => setAppState(prev => ({...prev, aspectRatio: v}))} />
                        <AspectRatioButton value="1:1" label="1:1" currentValue={aspectRatio} onClick={(v) => setAppState(prev => ({...prev, aspectRatio: v}))} />
                    </div>
                </div>

                <button
                onClick={onVideoGenerate}
                disabled={isLoading || !videoPrompt.trim()}
                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                Generate Video
                </button>
                {renderPromptEnhancers()}
            </div>
            )}
        </div>
      </fieldset>
      {originalImages.length === 0 && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 rounded-2xl z-20">
            <p className="font-fancy text-2xl text-white">Let's Create!</p>
            <p className="text-gray-300">Start by uploading an image to enter your design studio.</p>
        </div>
       )}
    </div>
  );
};