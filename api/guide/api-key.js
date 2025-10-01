const fs = require('fs').promises;
const path = require('path');

// GitHub API를 사용하여 파일 업데이트
async function updateGitHubFile(filePath, content, message) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'angibeom0985-arch';
  const REPO_NAME = 'youtube-image';
  
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN이 설정되지 않았습니다.');
  }

  try {
    // 1. 현재 파일 정보 가져오기 (SHA 필요)
    const getFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
    }

    // 2. 파일 업데이트
    const updateFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const updateFileResponse = await fetch(updateFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
        branch: 'main'
      })
    });

    if (!updateFileResponse.ok) {
      const errorData = await updateFileResponse.json();
      throw new Error(`GitHub API 오류: ${errorData.message}`);
    }

    const result = await updateFileResponse.json();
    return result;
  } catch (error) {
    console.error('GitHub 파일 업데이트 오류:', error);
    throw error;
  }
}

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

      // GitHub API로 직접 파일 업데이트
      const componentFilePath = 'components/ApiKeyGuide.tsx';
      
      // 현재 파일 내용 가져오기
      const componentPath = path.join(process.cwd(), 'components', 'ApiKeyGuide.tsx');
      let componentContent = '';
      try {
        componentContent = await fs.readFile(componentPath, 'utf-8');
      } catch (err) {
        console.error('컴포넌트 파일을 읽을 수 없음:', err);
        return res.status(500).json({ error: '컴포넌트 파일을 찾을 수 없습니다.' });
      }
      
      // JSX return 문 안의 내용을 새로운 content로 교체
      const returnPattern = /(return\s*\(\s*[\s\S]*?<div className="min-h-screen bg-gray-50">\s*)([\s\S]*?)(\s*<\/div>\s*\)\s*;\s*}\s*;\s*export default ApiKeyGuide;)/;
      
      let updatedComponent;
      if (componentContent.match(returnPattern)) {
        updatedComponent = componentContent.replace(
          returnPattern,
          `$1${content}$3`
        );
      } else {
        // 패턴이 맞지 않으면 전체 컴포넌트 내용을 새로 생성
        updatedComponent = `import React from 'react';
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
      }
      
      // GitHub API를 통해 파일 커밋
      try {
        const commitMessage = `Update: API 키 발급 가이드 자동 업데이트 (Admin 페이지)`;
        await updateGitHubFile(componentFilePath, updatedComponent, commitMessage);
        
        console.log('✅ GitHub에 자동 커밋 완료!');
        
        res.status(200).json({ 
          success: true, 
          message: '✅ API 키 발급 가이드가 GitHub에 자동으로 커밋되었습니다!\n\n🚀 Vercel이 자동으로 재배포를 시작합니다. (1-2분 소요)\n페이지를 새로고침하면 변경사항을 확인할 수 있습니다.' 
        });
      } catch (githubError) {
        console.error('GitHub 커밋 실패:', githubError);
        
        // GitHub 커밋 실패 시 로컬에만 저장
        await fs.writeFile(componentPath, updatedComponent, 'utf-8');
        
        res.status(200).json({ 
          success: true, 
          message: '⚠️ 파일은 저장되었지만 GitHub 자동 커밋에 실패했습니다.\n\nGitHub Token이 설정되지 않았을 수 있습니다.\n로컬 환경에서는 정상 작동합니다.' 
        });
      }
    } catch (error) {
      console.error('❌ API guide 저장 오류:', error);
      res.status(500).json({ error: '파일을 저장할 수 없습니다: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
