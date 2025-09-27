import React from 'react';
import UserGuide from './UserGuide';
import MetaTags from './MetaTags';

interface UserGuidePageProps {
    onBack?: () => void;
}

const UserGuidePage: React.FC<UserGuidePageProps> = ({ onBack }) => {
    return (
        <>
            <MetaTags 
                title="유튜브 이미지 생성기 사용법 가이드 - AI로 콘텐츠 제작하기"
                description="AI를 활용하여 유튜브 페르소나와 영상 소스를 생성하는 방법을 상세히 알려드립니다. 단계별 가이드로 쉽게 따라하세요."
                url="https://youtube-image.money-hotissue.com/유튜브_이미지_생성기_사용법_가이드"
                image="/user-guide-preview.png"
                type="article"
            />
            <UserGuide onBack={onBack} />
        </>
    );
};

export default UserGuidePage;