const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const componentPath = path.join(process.cwd(), 'components', 'ApiKeyGuide.tsx');
      const componentContent = await fs.readFile(componentPath, 'utf-8');
      
      // JSX return 문에서 div 내용 추출
      const returnPattern = /return\s*\(\s*<div className="min-h-screen bg-gray-50">\s*([\s\S]*?)\s*<\/div>\s*\)\s*;/;
      const match = componentContent.match(returnPattern);
      const content = match ? match[1].trim() : '';
      
      console.log('API 키 가이드 로드됨, 내용 길이:', content.length);
      res.status(200).json({ content });
    } catch (error) {
      console.error('Error reading api guide component:', error);
      res.status(500).json({ error: '컴포넌트 파일을 읽을 수 없습니다.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { content } = req.body;
      console.log('API 키 가이드 저장 요청 받음');
      console.log('내용 길이:', content ? content.length : 0);
      
      if (!content) {
        console.error('내용이 없음');
        return res.status(400).json({ error: '내용이 제공되지 않았습니다.' });
      }

      // React 컴포넌트 파일 경로
      const componentPath = path.join(process.cwd(), 'components', 'ApiKeyGuide.tsx');
      console.log('저장할 컴포넌트 경로:', componentPath);
      
      // React 컴포넌트 파일 읽기
      let componentContent = '';
      try {
        componentContent = await fs.readFile(componentPath, 'utf-8');
      } catch (err) {
        console.error('컴포넌트 파일을 읽을 수 없음:', err);
        return res.status(500).json({ error: '컴포넌트 파일을 찾을 수 없습니다.' });
      }
      
      // JSX return 문 안의 내용을 새로운 content로 교체
      const returnPattern = /(return\s*\(\s*[\s\S]*?<div className="min-h-screen bg-gray-50">\s*)([\s\S]*?)(\s*<\/div>\s*\)\s*;\s*}\s*;\s*export default ApiKeyGuide;)/;
      
      if (componentContent.match(returnPattern)) {
        const updatedComponent = componentContent.replace(
          returnPattern,
          `$1${content}$3`
        );
        await fs.writeFile(componentPath, updatedComponent, 'utf-8');
      } else {
        // 패턴이 맞지 않으면 전체 컴포넌트 내용을 새로 생성
        const newComponent = `import React from 'react';
import DisplayAd from './DisplayAd';

interface ApiKeyGuideProps {
    onBack?: () => void;
}

const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            ${content}
        </div>
    );
};

export default ApiKeyGuide;`;
        await fs.writeFile(componentPath, newComponent, 'utf-8');
      }
      
      console.log('✅ API 키 발급 가이드가 성공적으로 업데이트되었습니다.');
      
      res.status(200).json({ 
        success: true, 
        message: '✅ API 키 발급 가이드 내용이 성공적으로 업데이트되었습니다! GitHub에 커밋하고 배포해주세요.' 
      });
    } catch (error) {
      console.error('❌ API guide 저장 오류:', error);
      res.status(500).json({ error: '파일을 저장할 수 없습니다: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
