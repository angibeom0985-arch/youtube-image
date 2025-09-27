import React from 'react';
import MetaTags from './MetaTags';

interface MainPageProps {
    children: React.ReactNode;
}

const MainPage: React.FC<MainPageProps> = ({ children }) => {
    return (
        <>
            <MetaTags 
                title="유튜브 롱폼 이미지 생성기 - AI로 캐릭터와 스토리보드 만들기"
                description="Google Gemini AI를 활용해 유튜브 콘텐츠용 페르소나와 영상 소스를 쉽고 빠르게 생성하세요. 다양한 비율(9:16, 16:9, 1:1) 지원."
                url="https://youtube-image.money-hotissue.com"
                image="/og-image.png"
                type="website"
            />
            {children}
        </>
    );
};

export default MainPage;