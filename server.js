const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;

// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// API 키 발급 가이드 내용 가져오기
app.get('/api/guide/api-key', async (req, res) => {
    try {
        const componentPath = path.join(__dirname, 'components', 'ApiKeyGuide.tsx');
        const componentContent = await fs.readFile(componentPath, 'utf-8');
        
        // JSX return 문에서 div 내용 추출
        const returnPattern = /return\s*\(\s*<div className="min-h-screen bg-gray-50">\s*([\s\S]*?)\s*<\/div>\s*\)\s*;/;
        const match = componentContent.match(returnPattern);
        const content = match ? match[1].trim() : '';
        
        console.log('API 키 가이드 로드됨, 내용 길이:', content.length);
        res.json({ content });
    } catch (error) {
        console.error('Error reading api guide component:', error);
        res.status(500).json({ error: '컴포넌트 파일을 읽을 수 없습니다.' });
    }
});

// API 키 발급 가이드 내용 저장하기
app.post('/api/guide/api-key', async (req, res) => {
    try {
        const { content } = req.body;
        console.log('API 키 가이드 저장 요청 받음');
        console.log('내용 길이:', content ? content.length : 0);
        
        if (!content) {
            console.error('내용이 없음');
            return res.status(400).json({ error: '내용이 제공되지 않았습니다.' });
        }

        // React 컴포넌트 파일 경로
        const componentPath = path.join(__dirname, 'components', 'ApiKeyGuide.tsx');
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
        // return 문의 시작부터 마지막 }; 전까지를 교체
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
        res.json({ success: true, message: '✅ API 키 발급 가이드 내용이 성공적으로 업데이트되었습니다!' });
    } catch (error) {
        console.error('❌ API guide 저장 오류:', error);
        res.status(500).json({ error: '파일을 저장할 수 없습니다: ' + error.message });
    }
});

// 사용법 가이드 내용 가져오기
app.get('/api/guide/user-guide', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'public', 'guides', 'user-guide.html');
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading user guide:', error);
        res.status(500).json({ error: '파일을 읽을 수 없습니다.' });
    }
});

// 사용법 가이드 내용 저장하기
app.post('/api/guide/user-guide', async (req, res) => {
    try {
        const { content } = req.body;
        console.log('사용법 가이드 저장 요청 받음');
        console.log('내용 길이:', content ? content.length : 0);
        
        if (!content) {
            console.error('내용이 없음');
            return res.status(400).json({ error: '내용이 제공되지 않았습니다.' });
        }

        // React 컴포넌트 파일 경로
        const componentPath = path.join(__dirname, 'components', 'UserGuide.tsx');
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
        // return 문의 시작부터 마지막 }; 전까지를 교체
        const returnPattern = /(return\s*\(\s*[\s\S]*?<div className="min-h-screen bg-gray-50">\s*)([\s\S]*?)(\s*<\/div>\s*\)\s*;\s*}\s*;\s*export default UserGuide;)/;
        
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

interface UserGuideProps {
    onBack?: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            ${content}
        </div>
    );
};

export default UserGuide;`;
            await fs.writeFile(componentPath, newComponent, 'utf-8');
        }
        
        console.log('✅ 사용법 가이드가 성공적으로 업데이트되었습니다.');
        res.json({ success: true, message: '✅ 사용법 가이드 내용이 성공적으로 업데이트되었습니다!' });
    } catch (error) {
        console.error('❌ User guide 저장 오류:', error);
        res.status(500).json({ error: '파일을 저장할 수 없습니다: ' + error.message });
    }
});

// 사용법 가이드 내용 가져오기
app.get('/api/guide/user-guide', async (req, res) => {
    try {
        const componentPath = path.join(__dirname, 'components', 'UserGuide.tsx');
        const componentContent = await fs.readFile(componentPath, 'utf-8');
        
        // JSX return 문에서 div 내용 추출
        const returnPattern = /return\s*\(\s*<div className="min-h-screen bg-gray-50">\s*([\s\S]*?)\s*<\/div>\s*\)\s*;/;
        const match = componentContent.match(returnPattern);
        const content = match ? match[1].trim() : '';
        
        console.log('사용법 가이드 로드됨, 내용 길이:', content.length);
        res.json({ content });
    } catch (error) {
        console.error('Error reading user guide component:', error);
        res.status(500).json({ error: '컴포넌트 파일을 읽을 수 없습니다.' });
    }
});

// 이미지 업로드 처리
app.post('/api/upload-image', async (req, res) => {
    try {
        const { filename, data } = req.body;
        if (!filename || !data) {
            return res.status(400).json({ error: '파일명과 데이터가 필요합니다.' });
        }

        const imagePath = path.join(__dirname, 'public', filename);
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
        await fs.writeFile(imagePath, base64Data, 'base64');
        
        console.log(`이미지가 업로드되었습니다: ${filename}`);
        res.json({ success: true, message: '이미지가 성공적으로 업로드되었습니다.' });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: '이미지를 업로드할 수 없습니다.' });
    }
});

// 파일 목록 가져오기
app.get('/api/files', async (req, res) => {
    try {
        const publicDir = path.join(__dirname, 'public');
        const files = await fs.readdir(publicDir);
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
        );
        res.json({ files: imageFiles });
    } catch (error) {
        console.error('Error reading files:', error);
        res.status(500).json({ error: '파일 목록을 가져올 수 없습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Admin 서버가 http://localhost:${PORT} 에서 실행중입니다.`);
    console.log(`📝 Admin 패널: http://localhost:${PORT}/admin.html`);
});