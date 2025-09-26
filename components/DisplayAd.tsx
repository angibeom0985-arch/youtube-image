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
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.log('AdSense Display error:', err);
    }
  }, []);

  return (
    <div className={`my-12 ${className}`} style={style}>
      <div className="text-center bg-gray-900/50 border border-gray-600 rounded-xl p-6">
        <div className="text-gray-400 text-sm mb-4">광고</div>
        <ins 
          className="adsbygoogle"
          style={{ 
            display: 'block',
            width: '100%',
            height: '300px'
          }}
          data-ad-client="ca-pub-2686975437928535"
          data-ad-slot="2376295288"
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
        <div className="text-gray-500 text-xs mt-4">
          광고 수익은 서비스 운영에 도움이 됩니다 💙
        </div>
      </div>
    </div>
  );
};

export default DisplayAd;