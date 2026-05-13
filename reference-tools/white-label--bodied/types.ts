
export enum Tab {
  CHAT = 'Chat',
  GENERATE = 'Generate',
  ANALYZE = 'Analyze',
  EDIT = 'Edit',
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}
