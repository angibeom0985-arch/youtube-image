export interface Character {
  id: string;
  name: string;
  description: string;
  image: string; // base64 encoded string
}

export interface StoryboardImage {
  id: string;
  image: string; // base64 encoded string
  sceneDescription: string;
}

// 영상 소스 이미지 타입 (StoryboardImage와 동일)
export type VideoSourceImage = StoryboardImage;

// Gemini specific types
export interface RawCharacterData {
  name: string;
  description: string;
}