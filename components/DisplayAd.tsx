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
        {/* AdSense 반응형 디스플레이 광고 - 수평 레이아웃 최적화 */}
        <ins 
          className="adsbygoogle"
          style={{ 
            display: 'block',
            width: '100%',
            height: '280px'
          }}
          data-ad-client="ca-pub-2686975437928535"
          data-ad-slot="2376295288"
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default DisplayAd;