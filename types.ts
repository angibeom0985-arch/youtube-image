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

// 이미지 비율 타입
export type AspectRatio = '9:16' | '16:9' | '1:1';

// 이미지 스타일 타입
export type ImageStyle = 
  | '감성 멜로' 
  | '서부극' 
  | '공포 스릴러' 
  | '1980년대' 
  | '2000년대' 
  | '사이버펑크' 
  | '판타지' 
  | '미니멀' 
  | '빈티지' 
  | '모던' 
  | 'custom';

// 사진 구도 타입
export type PhotoComposition = 
  | '정면' 
  | '측면' 
  | '반측면' 
  | '위에서' 
  | '아래에서' 
  | '전신' 
  | '상반신' 
  | '클로즈업';

// Gemini specific types
export interface RawCharacterData {
  name: string;
  description: string;
}