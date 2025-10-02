import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

const AdBanner: React.FC = () => {
    const adRef = useRef<HTMLModElement>(null);
    const [isClient, setIsClient] = useState(false);
    const hasInitialized = useRef(false);

    useEffect(() => {
        // 클라이언트 사이드에서만 실행
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || hasInitialized.current) return;

        const initAd = () => {
            try {
                if (adRef.current && typeof window !== 'undefined') {
                    const adElement = adRef.current;
                    
                    // 광고 요소가 화면에 있고 크기가 있는지 확인
                    const rect = adElement.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) {
                        return; // 크기가 없으면 재시도
                    }

                    // AdSense 스크립트가 로드되었는지 확인
                    if (window.adsbygoogle) {
                        window.adsbygoogle.push({});
                        hasInitialized.current = true;
                    }
                }
            } catch (err) {
                // 오류 무시 (광고 차단기 등)
            }
        };

        // 여러 시점에 초기화 시도
        const timers = [
            setTimeout(initAd, 300),
            setTimeout(initAd, 1000),
            setTimeout(initAd, 2000),
        ];

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [isClient]);

    // 서버 사이드 렌더링 중에는 빈 컨테이너만 반환
    if (!isClient) {
        return <div className="my-8 w-full" style={{ minHeight: '100px' }} />;
    }

    return (
        <div className="my-8 w-full">
            <div className="max-w-7xl mx-auto px-4">
                <ins
                    ref={adRef}
                    className="adsbygoogle"
                    style={{
                        display: 'block',
                        minWidth: '300px',
                        minHeight: '100px',
                        width: '100%',
                    }}
                    data-ad-client="ca-pub-2686975437928535"
                    data-ad-slot="2376295288"
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                />
            </div>
        </div>
    );
};

export default AdBanner;
