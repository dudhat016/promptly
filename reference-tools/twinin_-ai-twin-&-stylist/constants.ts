import { TwininOptions } from './types';

export const INITIAL_OPTIONS: TwininOptions = {
  ethnicity: 'Black / African American',
  skin_description: 'glowing skin with a dewy finish',
  complexion: 'Golden Honey',
  freckles: 'soft',
  dimples: 'none',
  expression: 'Soft closed-mouth smile',
  pose: 'Standing straight, hands on hips, facing camera',
  hair_style: 'Silky straight waist-length',
  hair_color_main: 'Platinum blonde',
  hair_color_secondary: '',
  hair_color_pattern: 'solid',
  makeup_style: 'Soft glam (neutral browns, champagne shimmer)',
  makeup_brand_vibe: 'Charlotte Tilbury',
  designer_vibe: 'Dior',
  outfit_style_notes: 'cozy pink feather robe & laptop in bed',
  scene_type: 'indoor_luxury',
  christmas_scene: '',
  teeth_type: 'natural_realistic',
  image_ratio: '3:4 vertical',
  retouch_level: 'soft_skin_but_keep_texture',
};

export const COMPLEXION_PRESETS = [
  'Cool Ivory', 'Golden Honey', 'Warm Almond', 'Sunkissed Bronze', 'Rich Espresso',
  'Pale', 'Fair', 'Light', 'Caramel', 'Brown', 'Dark', 'Alabaster / Albino'
];

export const PRESET_OUTFITS = [
    { image: 'https://placehold.co/200x300/FF6B6B/FFFFFF?text=Date+Night\\nDress', description: 'A stunning, silky red off-the-shoulder dress for a romantic date night.' },
    { image: 'https://placehold.co/200x300/F5C453/FFFFFF?text=Boss+Babe\\nBlazer', description: 'A sharp, tailored white blazer with gold buttons, paired with matching trousers.' },
    { image: 'https://placehold.co/200x300/C7A0FF/FFFFFF?text=Cozy+Chic\\nKnitwear', description: 'A cozy oversized cream cable-knit sweater with leggings and Ugg boots.' },
    { image: 'https://placehold.co/200x300/FF4FA3/FFFFFF?text=Pink+Carpet\\nGown', description: 'A glamorous, floor-length pink sequin gown for a red carpet event.' },
    { image: 'https://placehold.co/200x300/4ECDC4/FFFFFF?text=Beach+Vibes\\nSet', description: 'A breezy, mint green linen two-piece set with a crop top and wide-leg pants.' },
    { image: 'https://placehold.co/200x300/111111/FFFFFF?text=Street+Style\\nLeather', description: 'A classic black leather motorcycle jacket with distressed jeans and chunky boots.' },
];


export const ETHNICITY_OPTIONS = [
  'Black / African American', 'Afro-Caribbean', 'Afro-Latina / Afro-Latino', 'East African', 'West African',
  'North African / Maghrebi', 'Middle Eastern / Arab', 'South Asian (Indian, Pakistani, Bangladeshi)',
  'Sri Lankan / Tamil', 'Southeast Asian (Filipina, Indonesian, Malaysian, etc.)', 'Thai / Vietnamese',
  'East Asian (Chinese, Korean, Japanese)', 'Pacific Islander / Polynesian', 'Native American / Indigenous North American',
  'First Nations / Inuit', 'Latina / Latino (non-Afro)', 'Brazilian mixed race', 'White / European',
  'Eastern European / Slavic', 'Mixed race / Biracial'
];

export const HAIR_COLOR_OPTIONS = [
  'Jet black', 'Soft natural black', 'Espresso dark brown', 'Chocolate brown', 'Warm chestnut brown', 'Golden brown',
  'Honey caramel', 'Butterscotch blonde', 'Golden blonde', 'Platinum blonde', 'Ash blonde', 'Strawberry blonde',
  'Copper auburn', 'Rich mahogany red', 'Burgundy wine', 'Cool smoky gray', 'Silver icy platinum'
];

export const HAIR_STYLE_OPTIONS = [
  // Original Styles
  'Silky straight waist-length', 'Silky straight mid-back length', 'Silky straight blunt bob', 'Silky straight lob with middle part',
  'Bone-straight with flipped ends', 'Yaki straight leave-out', 'Relaxed straight with body', 'Pressed natural straight',
  'Loose beachy waves', 'Hollywood glam waves', 'Deep waves side part', 'Loose S-waves with layers', 'Wet-look waves',
  'Mermaid waves extra long', 'Barrel curls blowout', 'Bouncy roller-set curls', 'Tight corkscrew curls', 'Defined ringlet curls',
  '3A loose spiral curls', '3B springy curls', '3C dense curls', '4A coily corkscrews', '4B z-pattern coils', '4C fluffy afro',
  'Tapered teeny afro', 'Round halo afro', 'Blown-out afro', 'High puff', 'Double puffs', 'Space buns', 'Messy top knot',
  'Sleek high ponytail', 'Sleek low ponytail middle part', 'Side ponytail', 'Half-up half-down ponytail', 'Half-up top knot',
  'Bubble ponytail', 'Braid-out texture', 'Twist-out texture', 'Two-strand twists shoulder length', 'Two-strand twists long',
  'Flat twists into puff', 'Cornrow straight backs', 'Cornrow zigzag part', 'Feed-in braids mid-back', 'Knotless box braids medium',
  'Knotless box braids small', 'Boho box braids with curls', 'Goddess braids updo', 'Fulani tribal braids', 'Lemonade side braids',
  'Fishtail braid', 'Dutch braid crown', 'French braid low', 'Halo braid updo', 'Braided ponytail', 'Locs shoulder-length',
  'Locs waist-length', 'Faux locs boho', 'Sisterlocks micro', 'Starter coils for locs', 'Curly pixie cut', 'Tapered curly cut',
  'Shag cut with bangs', 'Curtain bangs with waves', 'Full blunt bangs', 'Wispy fringe bangs', 'Side-swept bangs', 'Curly bangs',
  'Bantu knots full head', 'Bantu knots with loose back', 'Finger waves short', 'Retro pin-up waves', 'Sleek chignon bun',
  'Low messy bun', 'Braided bun', 'Elegant French twist', 'Voluminous blowout layers', '90s supermodel blowout', 'Clip-in ponytail extra long',
  // New Additions (23)
  'Slicked-back wet look', 'Boho braids with flowers', 'Asymmetrical pixie cut', 'Jumbo twists high ponytail',
  'Wolf cut with curtain bangs', 'Glass hair blunt bob', 'Butterfly locs', 'Passion twists',
  'Micro braids', 'Shaggy mullet with wispy bangs', '70s feathered layers', 'Bubble braids',
  'Crown braid with tendrils', 'Spiky top knot', 'Half-up space buns', 'Braided bantu knots',
  'Faux hawk with shaved sides', 'Colorful pastel dip-dye', 'Two-tone e-girl streaks',
  'Long faux locs with shells', 'Glamorous finger waves (long hair)', 'Sculpted baby hairs with sleek ponytail',
  'Voluminous afro with a side part'
];

export const EXPRESSION_OPTIONS = [
  'Soft closed-mouth smile', 'Big open-mouth laugh', 'Slight smirk with one brow raised', 'Serious boss-mode gaze at camera',
  'Playful pouty lips', 'Eyes-closed blissful smile', 'Flirty side-eye with half-smile'
];

export const POSE_OPTIONS = [
  'Standing straight, hands on hips, facing camera', 'Standing three-quarter angle, one hand in hair',
  'Standing profile, looking back over shoulder', 'Walking toward camera on street, mid-step',
  'Walking along the beach holding the viewer’s hand', 'Seated on bed, legs crossed, holding a mug',
  'Seated on sofa, laptop on lap, focused on screen', 'Seated at desk, chin resting on hand, thoughtful',
  'Leaning against wall, arms folded, confident', 'Leaning on balcony rail, cityscape in background',
  'Half-body crop from bust up, relaxed shoulders', 'Close-up beauty crop from collarbone up',
  'Lying on stomach on bed, feet up, chin on hands', 'Kneeling on bed facing camera, relaxed pose',
  'One knee up seated, arm draped casually over knee', 'Hands in pockets, relaxed street-style stance',
  'Twirling dress or skirt mid-spin', 'Hair-flip moment with motion and movement',
  'Holding handbag in one hand, other hand on hip', 'Cross-legged on floor with coffee and laptop',
  'Snow-scene with hands in coat pockets by cabin', 'Sitting in car seat, one arm resting on steering wheel'
];

export const MAKEUP_STYLE_OPTIONS = [
  'Barely-there no-makeup makeup', 'Soft glam (neutral browns, champagne shimmer)', 'Full glam with cut crease & long lashes',
  'Dewy glass-skin look with glossy lips', 'Matte skin with sharp winged liner', 'Rosy sun-kissed cheeks & freckles',
  'Bronze goddess glow with golden highlight', 'Smoky eye in chocolate browns', 'Rose gold shimmer eye with nude lips',
  'Classic Hollywood red lip & cat eye', 'Peachy monochromatic (eyes, cheeks, lips)', 'Mauve cool-tone glam',
  'Bold graphic liner with nude skin', 'Glittery holiday glam with sparkly lids', 'Night-out glam with overlined plush lips'
];

export const MAKEUP_BRAND_OPTIONS = [
  'Fenty Beauty', 'MAC Cosmetics', 'NARS', 'Charlotte Tilbury', 'Huda Beauty', 'Pat McGrath Labs', 'Rare Beauty',
  'Too Faced', 'NYX Professional', 'Maybelline'
];

export const DESIGNER_VIBE_OPTIONS = [
  'Louis Vuitton', 'Chanel', 'Dior', 'Gucci', 'Prada', 'Fendi', 'Versace', 'Balenciaga', 'Saint Laurent', 'Burberry', 'Hermès',
  'Valentino', 'Givenchy', 'Balmain', 'Bottega Veneta', 'Alexander McQueen', 'Miu Miu', 'Celine', 'Off-White', 'Tom Ford',
  'Christian Louboutin', 'Jimmy Choo', 'Manolo Blahnik', 'Amina Muaddi', 'Telfar', 'Brandon Blackwood', 'Jacquemus',
  'Coach', 'Michael Kors', 'Kate Spade', 'Tory Burch', 'Skims', 'Fear of God', 'Rick Owens', 'Zimmermann'
];

export const SCENE_TYPE_OPTIONS = ['studio', 'indoor_luxury', 'outdoor_city', 'beach', 'snow_cabin', 'holiday_christmas'];

export const CHRISTMAS_SCENE_OPTIONS = [
  'Cozy cabin porch with falling snow and string lights', 'In front of a huge decorated Christmas tree and gift boxes',
  'Snuggled on a white bed in matching holiday pajamas, mug of cocoa', 'City balcony with skyline and twinkling holiday lights',
  'Walking through a Christmas market holding a warm drink', 'By a fireplace with stockings and candles',
  'In a snowy forest path with fairy lights and a fur-trim hood coat', 'Glam holiday party scene with sparkling dress and champagne',
  'Baking cookies in a warm kitchen with fairy lights', 'At a window with frost and snowflakes, holding a holiday mug'
];