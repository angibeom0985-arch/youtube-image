const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// 파비콘 생성 함수
async function generateFavicon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 배경 그라디언트 (브랜드 컬러)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // 둥근 모서리 효과 (모바일 아이콘용)
    if (size >= 180) {
        const radius = size * 0.2; // 20% 둥근 모서리
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // 중앙에 "YT" 텍스트 추가
    const fontSize = size * 0.35;
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 텍스트 그림자 효과
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowOffsetX = size * 0.02;
    ctx.shadowOffsetY = size * 0.02;
    ctx.shadowBlur = size * 0.05;
    
    ctx.fillText('YT', size / 2, size / 2);
    
    // 파일 저장
    const buffer = canvas.toBuffer('image/png');
    const publicPath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(publicPath, buffer);
    
    console.log(`파비콘 생성 완료: ${filename} (${size}x${size})`);
}

// ICO 파일 생성을 위한 함수 (단순 PNG를 ICO로 변환)
async function generateIco() {
    // 16x16과 32x32 크기의 파비콘을 먼저 생성
    await generateFavicon(16, 'favicon-16x16.png');
    await generateFavicon(32, 'favicon-32x32.png');
    
    // 32x32를 기본 favicon.ico로 복사 (실제 ICO 변환은 복잡하므로 PNG를 사용)
    const favicon32 = fs.readFileSync(path.join(__dirname, 'public', 'favicon-32x32.png'));
    fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), favicon32);
    
    console.log('favicon.ico 생성 완료');
}

// 모든 파비콘 생성
async function generateAllFavicons() {
    try {
        // public 디렉토리가 없으면 생성
        const publicDir = path.join(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }
        
        // 다양한 크기의 파비콘 생성
        await generateFavicon(16, 'favicon-16x16.png');
        await generateFavicon(32, 'favicon-32x32.png');
        await generateFavicon(180, 'apple-touch-icon.png');  // iOS용
        await generateFavicon(192, 'android-chrome-192x192.png');  // Android용
        await generateFavicon(512, 'android-chrome-512x512.png');  // Android용
        
        // ICO 파일 생성
        await generateIco();
        
        console.log('\n모든 파비콘 생성이 완료되었습니다! 🎉');
        
    } catch (error) {
        console.error('파비콘 생성 중 오류 발생:', error);
    }
}

// 실행
generateAllFavicons();