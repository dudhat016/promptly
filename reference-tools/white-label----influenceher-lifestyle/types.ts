export interface GenerationOptions {
  outfit: string;
  location: string;
  hairstyle: string;
  skin: string;
  numberOfImages: number;
  enhancer: string;
  scenePreset: string;
  height: string;
  bust: string;
  waist: string;
  hips: string;
  aspectRatio: string;
}

export interface GeneratedImage {
  id: string;
  src: string;
  prompt: string;
}
