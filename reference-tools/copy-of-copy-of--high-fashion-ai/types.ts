export enum AppTab {
  Assistant = 'Style Assistant',
  Stylist = 'Virtual Stylist',
  Concierge = 'Voice Concierge',
  FashionDiva = 'Fashion Diva',
}

export interface ChatMessagePart {
  text?: string;
  image?: {
    inlineData: {
      mimeType: string;
      data: string;
    };
    previewUrl: string;
  };
}
export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

export interface TranscriptionEntry {
  speaker: 'user' | 'model';
  text: string;
}