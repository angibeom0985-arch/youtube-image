import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface DisplayAdProps {
  className?: string;
  style?: React.CSSProperties;
}

const DisplayAd: React.FC<DisplayAdProps> = ({ className = "", style = {} }) => {
  useEffect(() => {
    try {
      console.log('DisplayAd: Initializing AdSense');
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('DisplayAd: AdSense push completed');
    } catch (err) {
      console.log('AdSense Display error:', err);
    }
  }, []);

  return (
    <div className={`my-8 flex justify-center ${className}`} style={style}>
      <div className="w-full max-w-4xl">
        {/* AdSense 광고 */}
        <ins 
          className="adsbygoogle"
          style={{ 
            display: 'block',
            minHeight: '100px'
          }}
          data-ad-client="ca-pub-2686975437928535"
          data-ad-slot="2376295288"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        
        {/* 개발/디버깅용 플레이스홀더 (프로덕션에서는 제거 예정) */}
        <div className="bg-gray-700 border-2 border-dashed border-gray-500 rounded-lg p-4 text-center text-gray-400 text-sm opacity-30">
          <span>광고 영역 (AdSense)</span>
        </div>
      </div>
    </div>
  );
};

export default DisplayAd;