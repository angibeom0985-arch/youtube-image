# Vercel 배포 스크립트

# 로컬에서 Vercel CLI를 사용하여 배포하는 경우 사용
# npm install -g vercel

echo "1. 의존성 설치 중..."
npm install

echo "2. 빌드 테스트 중..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    echo "3. Vercel 배포를 시작합니다..."
    echo "📝 환경 변수 GEMINI_API_KEY가 Vercel에 설정되어 있는지 확인하세요."
    # vercel --prod
else
    echo "❌ 빌드 실패. 오류를 확인하고 다시 시도하세요."
    exit 1
fi