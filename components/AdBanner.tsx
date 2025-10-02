import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

const AdBanner: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const adLoadedRef = useRef(false);

    useEffect(() => {
        // 클라이언트 사이드에서만 실행
        if (typeof window === 'undefined' || adLoadedRef.current) return;

        const loadAd = () => {
            try {
                if (!containerRef.current) return false;
                
                // 컨테이너의 실제 렌더링된 크기 확인
                const containerRect = containerRef.current.getBoundingClientRect();
                
                // 너비가 충분한지 확인 (최소 300px)
                if (containerRect.width < 300) {
                    console.log('AdBanner: Container width too small:', containerRect.width);
                    return false;
                }

                // ins 요소 찾기
                const insElement = containerRef.current.querySelector('.adsbygoogle') as HTMLElement;
                if (!insElement) return false;

                // ins 요소의 크기 확인
                const insRect = insElement.getBoundingClientRect();
                if (insRect.width < 300) {
                    console.log('AdBanner: Ad element width too small:', insRect.width);
                    return false;
                }

                // AdSense 푸시
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                adLoadedRef.current = true;
                console.log('AdBanner: Ad loaded successfully');
                return true;
            } catch (error) {
                console.error('AdBanner: Load error', error);
                return false;
            }
        };

        // 여러 시점에 광고 로드 시도
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryLoadAd = () => {
            attempts++;
            const success = loadAd();
            
            if (!success && attempts < maxAttempts) {
                setTimeout(tryLoadAd, 500 * attempts); // 점진적으로 지연 시간 증가
            }
        };

        // 첫 시도는 약간의 지연 후
        const initialTimer = setTimeout(tryLoadAd, 500);

        return () => {
            clearTimeout(initialTimer);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            style={{ 
                margin: '2rem auto',
                padding: '0 1rem',
                maxWidth: '1280px',
                minWidth: '300px',
                width: '100%',
                boxSizing: 'border-box',
            }}
        >
            <ins
                className="adsbygoogle"
                style={{
                    display: 'block',
                    width: '100%',
                    minWidth: '300px',
                    minHeight: '250px',
                    boxSizing: 'border-box',
                }}
                data-ad-client="ca-pub-2686975437928535"
                data-ad-slot="2376295288"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default AdBanner;
