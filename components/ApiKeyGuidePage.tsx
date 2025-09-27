import React from 'react';
import ApiKeyGuide from './ApiKeyGuide';
import MetaTags from './MetaTags';

interface ApiKeyGuidePageProps {
    onBack?: () => void;
}

const ApiKeyGuidePage: React.FC<ApiKeyGuidePageProps> = ({ onBack }) => {
    return (
        <>
            <MetaTags 
                title="API 발급 가이드 - 유튜브 롱폼 이미지 생성기"
                description="Google Gemini API 키 발급 방법을 단계별로 안내합니다. 무료로 유튜브 콘텐츠용 AI 이미지를 생성하세요."
                url="https://youtube-image.money-hotissue.com/api_발급_가이드"
                image="/api-guide-preview.png"
                type="article"
            />
            <ApiKeyGuide onBack={onBack} />
        </>
    );
};

export default ApiKeyGuidePage;