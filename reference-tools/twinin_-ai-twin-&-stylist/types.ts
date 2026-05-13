export type AppMode = 'create_twin' | 'outfit_switch';

export interface TwininOptions {
  ethnicity: string;
  skin_description: string;
  complexion: string;
  freckles: 'none' | 'soft' | 'medium' | 'heavy';
  dimples: 'none' | 'subtle' | 'defined';
  expression: string;
  pose: string;
  hair_style: string;
  hair_color_main: string;
  hair_color_secondary: string;
  hair_color_pattern: 'solid' | 'money_piece' | 'streaks' | 'ombre' | 'front_dark_back_light' | 'front_light_back_dark';
  makeup_style: string;
  makeup_brand_vibe: string;
  designer_vibe: string;
  outfit_style_notes: string;
  scene_type: string;
  christmas_scene: string;
  teeth_type: 'natural_realistic' | 'veneers_glam';
  image_ratio: '1:1 square' | '3:4 vertical' | '9:16 vertical' | '4:3' | '16:9';
  retouch_level: string;
}

export interface GeminiResponse {
  final_prompt: string;
  short_caption: string;
  scene_notes: string;
  safety_notes: string;
}

export interface GeneratedTwin {
  image: string;
  details: GeminiResponse | null;
  complexion: string;
  hairStyle: string;
  aspectRatio: string;
}