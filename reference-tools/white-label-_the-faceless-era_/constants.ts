import { ScenePreset, PromptTemplate } from './types';

export const ETHNICITY_OPTIONS = [
  'Unspecified', 
  'Black (e.g., deep brown, medium brown, light brown skin tone)', 
  'White (e.g., fair, olive, tan skin tone)', 
  'Hispanic / Latino/a/x (e.g., light to dark brown skin tones)', 
  'East Asian (e.g., fair to tan skin tones)', 
  'Middle Eastern / North African (e.g., olive to brown skin tones)', 
  'South Asian (e.g., light to deep brown skin tones)', 
  'Mixed Race (specify desired complexion in custom details)'
];

export const OUTPUT_MODES: PromptTemplate['mode'][] = [
  'image_only', 'image_plus_caption', 'moodboard_set'
];

export const ASPECT_RATIOS: PromptTemplate['aspect_ratio'][] = [
  '4:5', '16:9', '1:1', '3:4', '9:16'
];

export const SCENE_PRESETS: ScenePreset[] = [
  {
    name: "Night Toast (Default)",
    template: {
      aspect_ratio: "4:5",
      camera: { lens: "85mm", aperture: "f/1.8", iso: 125, shutter: "1/125s", wb: "4500K" },
      scene: "dim lounge with candle centerpiece and city bokeh",
      surface: "dark lacquer table",
      hero_objects: ["two champagne flutes mid-toast", "black clutch with gold chain", "small bowl of almonds"],
      hand_pose: "two hands—one with diamond glove-inspired bracelet—meeting in cheers",
      supporting_props: ["vogue magazine cover peeking", "dom-style champagne bottle blurred", "tea light candle"],
      lighting: "amber candles + soft practicals, subtle bloom",
      palette: ["ivory", "blush", "mocha", "rose-gold", "champagne", "black satin"],
      style_tags: ["city-night", "candle-glow", "crystal-coupe", "glossy", "faceless", "ebony-excellence"],
    }
  },
  {
    name: "Vanity Glam",
    template: {
      aspect_ratio: "4:5",
      scene: "sunlit vanity styling",
      surface: "white marble with grey veining",
      hero_objects: ["round gold-beaded mirror angled", "marble hat box of blush roses", "LV-style perfume cylinder", "luxury candle"],
      hand_pose: "no face; a hand adjusting the mirror edge, glossy nude nails, slim gold rings",
      lighting: "soft morning bounce, warm highlights on metal, gentle shadow falloff",
      style_tags: ["marble-vanity", "rose-gold", "editorial", "faceless", "vogue-paris"],
    }
  },
  {
    name: "Brunch Glow",
    template: {
      aspect_ratio: "3:4",
      scene: "golden-hour café table near window",
      surface: "veined stone bistro tabletop",
      hero_objects: ["wine glass with white wine sparkle", "Gucci-style mini bag", "ornate menu"],
      hand_pose: "hand holding stemware, ring stack + beaded bracelet",
      lighting: "sun flare + warm rim light, specular glass highlights",
      style_tags: ["brunch-sun", "designer-textures", "editorial", "faceless"],
    }
  },
  {
    name: "In-Car Luxe",
    template: {
      aspect_ratio: "1:1",
      scene: "car interior close-up",
      surface: "matte leather steering wheel",
      hero_objects: ["two-tone bracelet watch", "LV monogram mini backpack blurred on lap"],
      hand_pose: "hand resting on wheel, ivory manicure, engagement ring sparkle",
      lighting: "natural daylight, soft specular on metal",
      style_tags: ["editorial", "designer-textures", "faceless", "soft-life"],
    }
  },
  {
    name: "Shopping Runway",
    template: {
      aspect_ratio: "4:5",
      scene: "backseat shopping moment",
      surface: "soft wool scarf with subtle monogram",
      hero_objects: ["transparent monogram box bag with gold hardware", "Gucci shopping tote blurred"],
      hand_pose: "hand draped over bag, French tips with micro gold flakes",
      lighting: "overcast window light, clean highlights",
      style_tags: ["vogue-paris", "designer-textures", "glossy", "faceless"],
    }
  },
  {
    name: "Editorial Table Flat-lay",
    template: {
      aspect_ratio: "3:4",
      scene: "marble tabletop editorial lay",
      surface: "cool marble with strong veining",
      hero_objects: ["Vogue magazine diagonal", "gold patterned ashtray used as jewelry tray", "bracelets + H bangle"],
      hand_pose: "none, pure still-life luxury",
      lighting: "soft top light + side glow for metal sparkle",
      style_tags: ["editorial", "marble-vanity", "rose-gold", "faceless"],
    }
  }
];