import React, { useState } from 'react';

const fashionData = {
  'Luxe & High-End': [
    'Luxury runway couture', 'Parisian chic editorial', 'Milan high-fashion street style',
    'Old money elegance', 'Quiet luxury neutrals', 'Soft luxury glam', 'Diamond-studded evening gowns',
    'Gold metallic goddess fashion', 'Red-carpet celebrity fashion', 'Black-tie haute couture',
    'Crystal mesh dresses', 'Pearlescent satin gowns', 'All-white luxury monochrome',
    'Vintage Hollywood glam', 'Velvet royal-inspired gowns', 'Paris runway tailored suits',
    'Opulent baroque fashion', 'Luxury fur coat winter fashion', 'High-fashion leather couture',
  ],
  'Streetwear & Trendy': [
    'Aesthetic streetwear', 'Y2K baddie fashion', 'Y2K glitter glam', 'Harajuku street fashion',
    'Sporty luxe tracksuits', 'Graffiti-print urban wear', 'Oversized hoodies + thigh highs',
    'Neon cyber streetwear', 'Denim-on-denim', 'Distressed grunge denim', 'Oversized bomber jacket streetwear',
    'Trendy crop tops + cargos', 'Metallic puffer jacket outfits', 'Curvy girl streetwear',
    'Techwear street style', 'Two-piece streetwear sets',
  ],
  'Soft, Feminine & Pretty': [
    'Soft girl pastel aesthetic', 'Coquette lace ribbons fashion', 'Barbiecore pink glam',
    'Cottagecore floral dresses', 'Satin slip dresses', 'Blush-toned soft glam',
    'Pastel sundress aesthetic', 'Pearly romantic fashion', 'Angelic white ruffle dresses',
    'Light academia feminine fashion', 'Balletcore chic', 'Blush satin midi dresses',
    'Silk bows + soft curls fashion', 'Pink tweed girly sets', 'Sweetheart neckline dresses',
    'Rosette dress trend',
  ],
  'Dark, Edgy & Alternative': [
    'Gothic glam couture', 'Dark feminine fashion', 'Leather & lace femme fatale',
    'Rocker grunge chic', 'Black monochrome luxe', 'Cyberpunk neon fashion', 'Dark academia',
    'All-black latex fashion', 'Vampire-inspired gothic couture', 'Punk leather studded fashion',
    'Corset + leather skirt outfits', 'Dark glam evening gowns', 'E-girl emo fashion',
    'Dramatic smokey black fashion', 'Phantom-style masked couture',
  ],
  'Vacation & Resort': [
    'Tropical vacation flowy dresses', 'Beach resort two-piece sets', 'Caribbean sundresses',
    'Island goddess wraps', 'Silk vacation skirts', 'Boho resort maxi dresses',
    'Tropical print monokinis', 'Crochet beach cover-ups', 'Santorini white + blue outfits',
    'Spanish vacation ruffle dresses', 'Linen wide-leg resort fashion',
  ],
  'Boss Babe & Business': [
    'Corporate chic pantsuits', 'Curvy girl CEO fashion', 'Blazer dresses',
    'Business-casual luxe', 'Monochrome office outfits', 'Silk blouse + tailored pants',
    'Pleated skirt business chic', 'High-waisted trousers + bodysuit', 'White-collar luxury professional',
    'Power blazer with gold buttons', 'Pencil skirt CEO vibe', 'Soft-pink business fashion',
  ],
  'Nightlife & Party': [
    'Sparkly sequin mini dresses', 'Bodycon nightclub outfits', 'Satin draped party dresses',
    'Metallic mini skirts + corsets', 'Cut-out dresses glam', 'Crystal-studded party fashion',
    'Black leather nightlife looks', 'Glitter halter dresses', 'Neon nightclub glam',
    'Faux fur party coats', 'Rhinestone mesh sets', 'High-slit satin gowns',
  ],
  'Cultural & Global': [
    'African Ankara fashion', 'Afro-futuristic couture', 'Caribbean carnival fashion',
    'Indian saree couture', 'Indian lehenga fashion', 'Korean streetwear aesthetic',
    'Japanese kimono modernized fashion', 'Brazilian festival fashion', 'Middle Eastern abaya luxury fashion',
    'Hispanic ruffle fiesta dresses',
  ],
  'Cozy, Winter & Fall': [
    'Oversized sweaters + boots', 'Cozy neutral fall fashion', 'Trench coat luxury',
    'Cashmere winter sets', 'Long wool coat chic', 'Knee-high boots winter outfits',
    'Fur-lined coat glam', 'Turtleneck sweater dresses', 'Plaid scarf fall fashion',
    'Snow glam winter coats',
  ],
  'Active, Fit & Athleisure': [
    'Gym athleisure sets', 'Yoga matching sets', 'Soft-girl pilates outfits',
    'Athletic luxe bodysuits', 'Designer workout leggings', 'Fitness influencer athleisure',
  ],
};

type FashionCategory = keyof typeof fashionData;


const FashionDiva: React.FC = () => {
    const categories = Object.keys(fashionData) as FashionCategory[];
    const [selectedCategory, setSelectedCategory] = useState<FashionCategory>(categories[0]);

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Categories Sidebar */}
                <aside className="md:col-span-1">
                    <h2 className="text-xl font-bold mb-4 text-gray-300">Categories</h2>
                    <div className="flex flex-col space-y-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none ${
                                selectedCategory === category 
                                    ? 'bg-gray-200 text-black' 
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Styles Display */}
                <main className="md:col-span-3">
                     <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">
                        {selectedCategory}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {fashionData[selectedCategory].map((style) => (
                            <div key={style} className="bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-gray-200 text-sm cursor-default hover:bg-gray-700 transition-colors">
                                {style}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FashionDiva;
