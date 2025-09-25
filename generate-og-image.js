const { createCanvas } = require('canvas');
const fs = require('fs');

// 캔버스 생성 (Open Graph 표준 크기: 1200x630)
const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// 배경 그라디언트
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, '#0f172a');
gradient.addColorStop(0.5, '#1e293b');
gradient.addColorStop(1, '#312e81');

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// 배경 격자 패턴
ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
ctx.lineWidth = 1;
for (let i = 0; i < 1200; i += 40) {
  ctx.beginPath();
  ctx.moveTo(i, 0);
  ctx.lineTo(i, 630);
  ctx.stroke();
}
for (let i = 0; i < 630; i += 40) {
  ctx.beginPath();
  ctx.moveTo(0, i);
  ctx.lineTo(1200, i);
  ctx.stroke();
}

// 장식용 원형들
ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.fill();

ctx.beginPath();
ctx.arc(1100, 530, 40, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
ctx.beginPath();
ctx.arc(1050, 80, 35, 0, Math.PI * 2);
ctx.fill();

// 메인 타이틀
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 72px Arial';
ctx.textAlign = 'center';
ctx.fillText('유튜브 롱폼', 600, 180);

// 서브 타이틀 (그라디언트 효과)
const titleGradient = ctx.createLinearGradient(400, 0, 800, 0);
titleGradient.addColorStop(0, '#8b5cf6');
titleGradient.addColorStop(0.5, '#3b82f6');
titleGradient.addColorStop(1, '#06b6d4');

ctx.fillStyle = titleGradient;
ctx.font = 'bold 64px Arial';
ctx.fillText('이미지 생성기', 600, 260);

// 설명 텍스트
ctx.fillStyle = '#d1d5db';
ctx.font = '28px Arial';
ctx.fillText('AI로 캐릭터와 스토리보드를 쉽고 빠르게 생성하세요', 600, 320);

// 기능 박스들
const features = [
  { icon: '🎭', text1: '페르소나', text2: '생성', x: 250 },
  { icon: '📋', text1: '스토리보드', text2: '제작', x: 600 },
  { icon: '🤖', text1: 'AI', text2: '기반', x: 950 }
];

features.forEach(feature => {
  // 박스 배경
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(feature.x - 80, 380, 160, 120, 16);
  ctx.fill();
  ctx.stroke();

  // 이모지
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(feature.icon, feature.x, 425);

  // 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(feature.text1, feature.x, 450);
  ctx.fillText(feature.text2, feature.x, 470);
});

// 하단 URL
ctx.fillStyle = '#6366f1';
ctx.font = 'bold 24px Arial';
ctx.textAlign = 'center';
ctx.fillText('youtube-image.momey-hotissue.com', 600, 560);

// PNG 파일로 저장
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/og-image.png', buffer);

console.log('Open Graph 이미지가 성공적으로 생성되었습니다: public/og-image.png');