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
    <div className={`my-8 flex justify-center ${className}`} style={style}>
      <ins 
        className="adsbygoogle"
        style={{ 
          display: 'block'
        }}
        data-ad-client="ca-pub-2686975437928535"
        data-ad-slot="2376295288"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default DisplayAd;