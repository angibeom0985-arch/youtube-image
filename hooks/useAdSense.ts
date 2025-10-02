import { useEffect } from 'react';

/**
 * Google AdSense 광고를 초기화하고 표시하는 커스텀 훅
 * IntersectionObserver를 사용하여 광고가 뷰포트에 들어올 때만 로드
 */
export const useAdSense = (enabled: boolean = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        const initializeAds = () => {
            try {
                // 아직 로드되지 않은 광고만 선택
                const adElements = document.querySelectorAll('.adsbygoogle:not([data-ad-loaded]):not([data-adsbygoogle-status])');
                
                if (adElements.length === 0) {
                    return;
                }

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const element = entry.target as HTMLElement;
                            
                            // 이미 로드된 광고는 건너뛰기
                            if (element.getAttribute('data-ad-loaded') || element.getAttribute('data-adsbygoogle-status')) {
                                return;
                            }

                            // 광고 요소의 크기 확인
                            const rect = element.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) {
                                // 크기가 0이면 다시 시도
                                setTimeout(() => {
                                    const newRect = element.getBoundingClientRect();
                                    if (newRect.width > 0 && newRect.height > 0) {
                                        loadAd(element);
                                    }
                                }, 300);
                                return;
                            }

                            loadAd(element);
                        }
                    });
                }, { 
                    rootMargin: '200px',
                    threshold: 0.01 
                });

                const loadAd = (element: HTMLElement) => {
                    try {
                        // @ts-ignore
                        const adsbygoogle = (window.adsbygoogle = window.adsbygoogle || []);
                        
                        if (typeof adsbygoogle.push === 'function') {
                            adsbygoogle.push({});
                            element.setAttribute('data-ad-loaded', 'true');
                        }
                    } catch (e) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('AdSense 광고 로드 실패:', e);
                        }
                    }
                };

                adElements.forEach(el => observer.observe(el));

                return () => observer.disconnect();
            } catch (e) {
                console.error('AdSense 초기화 오류:', e);
            }
        };

        // DOM이 완전히 로드된 후 실행
        const timer = setTimeout(initializeAds, 1000);
        return () => clearTimeout(timer);
    }, [enabled]);
};
