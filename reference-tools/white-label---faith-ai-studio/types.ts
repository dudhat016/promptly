
export type View = 'chat' | 'create' | 'ebook';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type ImageType = 'clipart' | 'stock-photo' | 'coloring-page';

export interface ReferenceImage {
  data: string; // base64 encoded string
  mimeType: string;
}

export interface GalleryItem {
  id: number;
  src: string;
  prompt: string;
  imageType: ImageType;
  referenceImage: ReferenceImage | null;
  attire?: string;
  scene?: string;
  coloringStyle?: string;
}