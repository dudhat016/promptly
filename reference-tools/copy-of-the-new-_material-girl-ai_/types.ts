export type Tab = 'edit' | 'video';

export type AspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1';

export type IdentityControl = 'exact' | 'inspired' | 'none';

export type Theme = 'solo' | 'couple' | 'mommy' | 'mini';

export interface AppState {
  originalImages: File[];
  editedImages: string[] | null;
  generatedVideoUrl: string | null;
  prompt: string;
  videoPrompt: string;
  aspectRatio: AspectRatio;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  activeTab: Tab;
  apiKeySelected: boolean;
  showApiKeyModal: boolean;
  identityControl: IdentityControl;
  theme: Theme;
  batchSize: number;
}
