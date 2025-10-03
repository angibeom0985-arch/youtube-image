<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 유튜브 롱폼 이미지 생성기

AI를 활용한 유튜브 콘텐츠 제작 도구 

구글 AI 스튜디오에서 제작된 YouTube 롱폼 콘텐츠를 위한 스토리보드 이미지 생성 도구입니다.

View your app in AI Studio: https://ai.studio/apps/drive/1Y3_dlsaZH3pGWj0maZoxmO7zP0MJ6_gl

## 🚀 기능

- **대본 분석**: 한국어 대본을 분석하여 주요 등장인물 추출
- **캐릭터 생성**: Google Gemini AI를 활용한 캐릭터 이미지 생성  
- **스토리보드**: 여러 장면의 이미지를 한 번에 생성
- **이미지 다운로드**: 개별 또는 ZIP 파일로 일괄 다운로드

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini 2.5 Flash API
- **스타일링**: Tailwind CSS
- **배포**: Vercel

## 📋 로컬 실행

**사전 요구사항:** Node.js

1. **의존성 설치**:
   ```bash
   npm install
   ```

2. **환경 변수 설정**:
   - `.env.example` 파일을 `.env`로 복사
   - `GEMINI_API_KEY`를 Google AI Studio에서 발급받은 실제 API 키로 설정

3. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

4. **빌드 테스트**:
   ```bash
   npm run build
   npm run preview
   ```

## 🌐 Vercel 배포 가이드

### 1단계: Vercel 프로젝트 설정
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소를 연결하여 프로젝트 import
3. Framework Preset: **Vite** 선택

### 2단계: 환경 변수 설정
Vercel 대시보드 → Project Settings → Environment Variables에서:
```
Name: GEMINI_API_KEY
Value: your_actual_google_ai_studio_api_key
```

### 3단계: 배포 확인
- Build Command: `npm run build` (자동 설정됨)
- Output Directory: `dist` (자동 설정됨)
- Install Command: `npm install` (자동 설정됨)

### 4단계: 커스텀 도메인 연결 (선택사항)
Vercel 대시보드의 Domains 섹션에서 원하는 도메인 추가

## 📁 주요 파일

- `vercel.json`: Vercel 배포 설정
- `.env.example`: 환경 변수 템플릿
- `vite.config.ts`: 빌드 및 환경 변수 설정
- `services/geminiService.ts`: Google Gemini AI 연동

## 🚨 배포 전 체크리스트

- [ ] `npm run build` 성공 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Vercel에서 환경 변수 `GEMINI_API_KEY` 설정 완료
- [ ] Google AI Studio API 사용량 한도 확인

## 🔧 문제 해결

**빌드 실패 시:**
- Node.js 버전 18+ 사용 확인
- `npm install` 재실행
- API 키가 올바르게 설정되었는지 확인

**배포 후 오류 시:**
- Vercel 함수 로그 확인
- 환경 변수가 프로덕션 환경에 올바르게 설정되었는지 확인
