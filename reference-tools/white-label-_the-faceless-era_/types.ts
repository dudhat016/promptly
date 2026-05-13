export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface CameraSettings {
  lens: string;
  aperture: string;
  iso: number;
  shutter: string;
  wb: string;
}

export interface CaptionConfig {
  tone: string;
  hashtags: string[];
}

export interface PromptTemplate {
  mode: 'image_only' | 'image_plus_caption' | 'moodboard_set';
  aspect_ratio: '1:1' | '4:5' | '3:4' | '16:9' | '9:16';
  camera: CameraSettings;
  scene: string;
  surface: string;
  hero_objects: string[];
  hand_pose: string;
  supporting_props: string[];
  lighting: string;
  palette: string[];
  style_tags: string[];
  ethnicity: string;
  custom_prompt: string;
}

export interface ScenePreset {
  name: string;
  template: Partial<PromptTemplate>;
}

export interface CaptionOutput {
  caption: string;
  hooks: string[];
  ctas: string[];
}
