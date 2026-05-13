export interface TwinStudioGalleryItem {
  id: string;
  imageSrc?: string; // base64 (no data: prefix)
  imageUrl?: string; // uploaded URL
  prompt: string;
  aspectRatio: string;
  hairstyle?: string;
  nails?: string;
  outfit?: string;
  skinComplexion?: string;
}

export type TwinStudioLoadingState =
  | 'regenerating'
  | 'changing outfit'
  | 'changing hair color'
  | 'changing outfit color'
  | false;

export type TwinStudioCardAction = 'regenerate' | 'change_outfit' | 'change_hair_color' | 'change_outfit_color';
