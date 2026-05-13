export type Character = 'ice_queen' | 'mrs_claus_baddie' | 'naughty_elf' | 'cozy_queen' | 'holiday_glam';
export type Style = 'photorealistic' | 'cinematic' | 'fashion_magazine' | 'vintage_film' | 'moody_portrait';
export type Setting = 'luxury_ski_lodge' | 'wintry_penthouse' | 'christmas_photoshoot_studio' | 'enchanted_ice_castle' | 'festive_city_street';
export type Vibe = 'naughty' | 'nice';

export interface GenerationOptions {
  character: Character;
  style: Style;
  setting: Setting;
  vibe: Vibe;
  customPrompt: string;
}