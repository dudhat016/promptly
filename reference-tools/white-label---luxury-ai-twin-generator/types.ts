export const Presets = [
  "Golden Hour Glow",
  "Red Carpet Glam",
  "Urban Couture",
  "Ethereal Dreamscape",
  "Influencer Aesthetic",
  "Commercial Beauty",
  "Cozy Holiday",
  "Luxury Lifestyle",
  "Vintage Film",
  "Monochrome Power",
] as const;

export type Preset = (typeof Presets)[number];

export const HairStyles = [
  "Sleek straight",
  "Bone straight",
  "Silk press",
  "Beach waves",
  "Loose waves",
  "Hollywood waves",
  "Natural curls",
  "Tight curls",
  "Spiral curls",
  "Ringlets",
  "Coils",
  "Type 3A curls",
  "Type 3B curls",
  "Type 3C curls",
  "Type 4A coils",
  "Type 4B coils",
  "Type 4C coils",
  "Bob cut",
  "Lob (long bob)",
  "Pixie cut",
  "Shag",
  "Layers",
  "Blunt cut",
  "A-line cut",
  "Asymmetrical cut",
  "Undercut",
  "Buzz cut",
  "High ponytail",
  "Low ponytail",
  "Sleek ponytail",
  "Messy ponytail",
  "Bubble ponytail",
  "Braided ponytail",
  "High bun",
  "Low bun",
  "Messy bun",
  "Top knot",
  "Space buns",
  "Braided bun",
  "Box braids",
  "Cornrows",
  "French braids",
  "Dutch braids",
  "Fishtail braid",
  "Crown braid",
  "Halo braid",
  "Goddess braids",
  "Senegalese twists",
  "Passion twists",
  "Faux locs",
  "Goddess locs",
  "Sister locs",
  "Traditional locs",
  "Finger waves",
  "1920s waves",
  "1960s flip",
  "1970s feather",
  "1980s perm",
  "Half up half down",
  "Pigtails",
  "Mohawk",
  "Faux hawk",
  "Slicked back",
  "Voluminous",
  "Crimped",
  "Blown out",
  "Twist out",
  "Braid out",
  "Rod set",
  "Flexi rod set",
  "Bantu knots",
  "Bantu knot out",
  "Wash and go",
  "Protective style",
  "Wig",
  "Lace front wig",
  "Ponytail extension",
  "Clip-in extensions",
  "Sew-in weave",
  "Platinum blonde",
  "White blonde",
  "Ash blonde",
  "Ice blonde",
  "Silver blonde",
  "Center part",
  "Side part",
  "Deep side part",
  "Zigzag part",
  "No part",
  "Brazilian blowout",
  "Keratin treatment",
  "Graduated bob",
  "Fade",
  "Taper",
  "Side ponytail",
  "Wrapped ponytail",
  "Twisted bun",
  "Sock bun",
  "Ballerina bun",
  "Donut bun",
  "Waterfall braid",
  "Milkmaid braids",
  "Marley twists",
  "Havana twists",
  "Kinky twists",
  "Spring twists",
  "Flat twists",
  "Two-strand twists",
  "Three-strand twists",
  "Rope twists",
  "Micro locs",
  "Freeform locs",
  "Barrel curls",
  "Pin curls",
  "Marcel waves",
  "Vintage waves",
  "1940s waves",
  "1990s layers",
  "2000s straightened",
  "Half ponytail",
  "Half bun",
  "Twin braids",
  "Double buns",
  "Cornrow mohawk",
  "Braided mohawk",
  "Pulled back",
  "Tucked behind ears",
  "One side tucked",
  "Teased crown",
  "Backcombed",
  "Air dried",
  "Diffused",
  "Scrunched",
  "Plopped",
  "Perm rod set",
  "Curlformer set",
  "Full lace wig",
  "U-part wig",
  "Closure wig",
  "Frontal wig",
  "360 lace wig",
  "Glueless wig",
  "Headband wig",
  "Tape-in extensions",
  "Quick weave",
  "Microlinks",
  "Fusion extensions",
] as const;


export type HairStyle = (typeof HairStyles)[number];

export interface ImageFeatures {
  faceShape: string;
  faceWidth: string;
  chinShape: string;
  cheekbones: string;
  eyeShape: string;
  eyeSize: string;
  eyeSpacing: string;
  eyeColor: string;
  irisDetail: string;
  pupilSize: string;
  upperLid: string;
  lowerLid: string;
  eyeWhites: string;
  browShape: string;
  browThickness: string;
  browColor: string;
  browArch: string;
  noseShape: string;
  noseBridge: string;
  noseTip: string;
  nostrils: string;
  lipShape: string;
  upperLipFullness: string;
  lowerLipFullness: string;
  lipColor: string;
  lipTexture: string;
  skinTone: string;
  skinUndertone: string;
  skinTexture: string;
  skinFinish: string;
  skinFeatures: string;
  hairColor: string;
  hairTexture: string;
  hairStyle: string;
  neckLength: string;
  shoulderWidth: string;
  collarbonesVisibility: string;
  bodyType: string;
  uniqueMarkers: string[];
  consistencySeed: number;
}
