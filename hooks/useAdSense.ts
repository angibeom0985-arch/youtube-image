import { useEffect } from 'react';

/**
 * Google AdSense 광고를 초기화하고 표시하는 커스텀 훅
 * 크기 확인 후 안전하게 광고 로드
 */
export const useAdSense = (enabled: boolean = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        const loadAd = (element: HTMLElement, retryCount: number = 0): void => {
            // 최대 5번까지 재시도
            const MAX_RETRIES = 5;
            const RETRY_DELAY = 500; // 500ms로 증가

            // 이미 로드된 광고는 건너뛰기
            if (element.getAttribute('data-ad-loaded') || element.getAttribute('data-adsbygoogle-status')) {
                return;
            }

            // 광고 요소의 실제 크기 확인
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);
            const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';

            if (!isVisible || rect.width < 100 || rect.height < 100) {
                // 크기가 충분하지 않으면 재시도
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        loadAd(element, retryCount + 1);
                    }, RETRY_DELAY);
                } else {
                    console.warn('AdSense: 광고 요소 크기 확인 실패 (최대 재시도 초과)', {
                        width: rect.width,
                        height: rect.height,
                        display: computedStyle.display,
                        visibility: computedStyle.visibility
                    });
                }
                return;
            }

            // 크기가 충분하면 광고 로드
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
                            loadAd(element, 0);
                        }
                    });
                }, { 
                    rootMargin: '300px',
                    threshold: 0.01 
                });

                adElements.forEach(el => observer.observe(el));

                return () => observer.disconnect();
            } catch (e) {
                console.error('AdSense 초기화 오류:', e);
            }
        };

        // DOM이 완전히 로드되고 CSS가 적용된 후 실행
        const timer = setTimeout(initializeAds, 2000);
        return () => clearTimeout(timer);
    }, [enabled]);
};
