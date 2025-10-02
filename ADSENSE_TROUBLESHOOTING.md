# AdSense 광고 송출 문제 해결 가이드

## 🔍 발견된 문제점들

### 1. ✅ CSP (Content Security Policy) 누락 도메인
**문제**: AdSense가 필요로 하는 일부 도메인이 CSP에서 차단됨
**해결**: 다음 도메인들을 CSP에 추가
- `https://www.google.com` (script-src, frame-src)
- `https://partner.googleadservices.com` (script-src, connect-src)
- `https://www.gstatic.com` (style-src)

### 2. ✅ 광고 로딩 타이밍 최적화
**문제**: 광고가 DOM 렌더링 전에 로드 시도
**해결**: 
- 초기 딜레이 2000ms로 증가
- 재시도 로직 5회로 확장
- 최소 크기 검증 강화 (100px)

### 3. ✅ 광고 컨테이너 크기 보장
**문제**: 부모 요소가 width=0인 상태에서 광고 로드
**해결**:
- 모든 광고 컨테이너에 `minWidth: 300px` 설정
- 명시적 `height: 280px` 설정
- `w-full`로 전체 너비 보장

## 📋 AdSense 요구사항 체크리스트

### ✅ 스크립트 로딩
- [x] AdSense 스크립트가 `<head>`에 있음
- [x] `async` 속성 사용
- [x] `crossorigin="anonymous"` 속성 설정
- [x] Preconnect 설정됨

### ✅ 광고 코드 구조
- [x] `data-ad-client` 올바름 (ca-pub-2686975437928535)
- [x] `data-ad-slot` 설정됨 (2376295288)
- [x] `data-ad-format="auto"` 설정
- [x] `data-full-width-responsive="true"` 설정

### ✅ CSP 정책
- [x] `pagead2.googlesyndication.com` 허용
- [x] `adservice.google.com` 허용
- [x] `googleads.g.doubleclick.net` 허용
- [x] `tpc.googlesyndication.com` 허용
- [x] `partner.googleadservices.com` 허용 (신규 추가)
- [x] `www.google.com` 허용 (신규 추가)
- [x] `www.gstatic.com` 허용 (신규 추가)

### ✅ 광고 컨테이너
- [x] 최소 300px 너비 보장
- [x] 최소 280px 높이 설정
- [x] `display: block` 설정
- [x] 부모 요소 가시성 확인

### ✅ JavaScript 로직
- [x] `data-ad-loaded` 중복 방지
- [x] `data-adsbygoogle-status` 확인
- [x] 크기 검증 (width >= 100px, height >= 100px)
- [x] 재시도 메커니즘 (최대 5회)
- [x] IntersectionObserver 사용

## 🎯 광고 배치 현황

### 메인 페이지 (App.tsx)
1. **광고 1** (Line 631): API 키 입력 ↔ 페르소나 생성 사이
2. **광고 2** (Line 992): 페르소나 생성 ↔ 영상 소스 생성 사이

### API 키 가이드 (ApiKeyGuide.tsx)
1. **광고 1** (Line 83): 가이드 시작 전
2. **광고 2** (Line 149): 중간 (1-2단계 사이)
3. **광고 3** (Line 262): 중간 (6-7단계 사이)
4. **광고 4** (Line 416): 마지막

### 사용법 가이드 (UserGuide.tsx)
1. **광고 1** (Line 48): 가이드 시작 전
2. **광고 2** (Line 149): 중간 (2-3단계 사이)
3. **광고 3** (Line 240): 중간 (4-5단계 사이)
4. **광고 4** (Line 352): 마지막

**총 광고 수**: 10개

## 🚀 최적화 내역

### Before (문제 상황)
```typescript
// 간단한 크기 체크만
if (rect.width === 0 || rect.height === 0) {
    setTimeout(() => loadAd(element), 300);
}
```

### After (개선)
```typescript
// 포괄적인 검증
const rect = element.getBoundingClientRect();
const computedStyle = window.getComputedStyle(element);
const isVisible = computedStyle.display !== 'none' && 
                  computedStyle.visibility !== 'hidden';

if (!isVisible || rect.width < 100 || rect.height < 100) {
    if (retryCount < 5) {
        setTimeout(() => loadAd(element, retryCount + 1), 500);
    }
}
```

## 🔧 추가 권장사항

### 1. AdSense 계정 확인
- [ ] ads.txt 파일 설정 확인
- [ ] 도메인 인증 완료 확인
- [ ] 광고 게재 승인 상태 확인

### 2. 브라우저 캐시
- [ ] 하드 리프레시 (Ctrl+Shift+R)
- [ ] 캐시 및 쿠키 삭제
- [ ] 시크릿 모드에서 테스트

### 3. 광고 차단기
- [ ] AdBlock 비활성화
- [ ] 브라우저 확장 프로그램 확인
- [ ] 방화벽/보안 소프트웨어 확인

### 4. 디버그 방법
```javascript
// 콘솔에서 AdSense 로드 확인
console.log(window.adsbygoogle);

// 광고 요소 확인
document.querySelectorAll('.adsbygoogle').forEach(el => {
    console.log({
        element: el,
        rect: el.getBoundingClientRect(),
        loaded: el.getAttribute('data-ad-loaded'),
        status: el.getAttribute('data-adsbygoogle-status')
    });
});
```

## 📊 예상 결과

### 수정 전
```
❌ TagError: No slot size for availableWidth=0
❌ 광고가 표시되지 않음
❌ 콘솔에 AdSense 오류
```

### 수정 후
```
✅ 광고가 정상 표시됨
✅ 콘솔 오류 없음
✅ 모든 광고 슬롯 활성화
```

## 🕒 배포 후 대기 시간

AdSense 광고가 표시되기까지:
1. **Vercel 배포**: 2-3분
2. **CDN 캐시 업데이트**: 5-10분
3. **AdSense 서버 동기화**: 10-30분
4. **첫 광고 노출**: 최대 1시간

**참고**: 새 광고 슬롯은 첫 승인까지 최대 24시간 소요될 수 있습니다.
