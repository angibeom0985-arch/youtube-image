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

// Gemini specific types
export interface RawCharacterData {
  name: string;
  description: string;
}