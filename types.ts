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

// 이미지 스타일 타입 (기존 호환성 유지)
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
  | '동물'
  | '실사 극대화'
  | '애니메이션' 
  | 'custom';

// 인물 스타일 타입
export type CharacterStyle = 
  | '실사 극대화'
  | '애니메이션'
  | '동물'
  | '1980년대'
  | '2000년대'
  | 'custom';

// 배경/분위기 스타일 타입
export type BackgroundStyle = 
  | '감성 멜로'
  | '서부극'
  | '공포 스릴러'
  | '사이버펑크'
  | '판타지'
  | '미니멀'
  | '빈티지'
  | '모던'
  | '먹방'
  | '귀여움'
  | 'AI'
  | '괴이함'
  | '창의적인'
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

// 20가지 카메라 앵글 타입
export type CameraAngle = 
  | 'Eye-Level Shot'        // 눈높이 샷
  | 'Dutch Angle'           // 더치 앵글
  | 'Rear View'             // 뒷모습
  | 'Leading Lines'         // 리딩 라인
  | 'High-Angle Shot'       // 하이 앵글
  | 'Point of View'         // POV
  | 'Symmetrical Framing'   // 대칭 프레이밍
  | 'Frame Within a Frame'  // 프레임 안의 프레임
  | 'Low-Angle Shot'        // 로우 앵글
  | 'Over-the-Shoulder Shot'// 어깨 너머 샷
  | 'Asymmetrical Framing'  // 비대칭 프레이밍
  | 'Golden Ratio'          // 황금비율
  | "Bird's-Eye View"       // 새의 눈 뷰
  | 'Profile Shot'          // 프로필 샷
  | 'Rule of Thirds'        // 3분할 법칙
  | 'Negative Space'        // 네거티브 스페이스
  | "Worm's-Eye View"       // 벌레의 눈 뷰
  | 'Three-Quarter View'    // 3/4 뷰
  | 'Center Framing'        // 센터 프레이밍
  | 'Fill the Frame';       // 프레임 가득 채우기

// 카메라 앵글 이미지 결과
export interface CameraAngleImage {
  id: string;
  angle: CameraAngle;
  image: string; // base64 encoded string
  angleName: string; // 한글 이름
  description: string; // 앵글 설명
}

// Gemini specific types
export interface RawCharacterData {
  name: string;
  description: string;
}