import React, { useEffect, useState } from 'react';

interface OfferWallProps {
  onClose: () => void;
  onAdCompleted: () => void;
}

const OfferWall: React.FC<OfferWallProps> = ({ onClose, onAdCompleted }) => {
  const [countdown, setCountdown] = useState(5);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowCloseButton(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // AdSense 스크립트 초기화
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch (error) {
      console.log('AdSense initialization error:', error);
    }

    return () => clearInterval(timer);
  }, []);

  const handleClose = () => {
    onAdCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 relative">
        {/* 닫기 버튼 - 5초 후 표시 */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        )}
        
        {/* 카운트다운 */}
        {!showCloseButton && (
          <div className="absolute top-4 right-4 bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-gray-700 font-bold">
            {countdown}
          </div>
        )}

        {/* 광고 헤더 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎁 무료 다운로드 제공 중!
          </h2>
          <p className="text-gray-600">
            광고를 시청해주셔서 감사합니다. 잠시만 기다려주세요.
          </p>
        </div>

        {/* 광고 영역 - Google AdSense */}
        <div className="bg-gray-100 rounded-lg p-8 mb-6 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            {/* AdSense 광고 슬롯 */}
            <ins className="adsbygoogle"
                 style={{ display: 'block' }}
                 data-ad-client="ca-pub-2686975437928535"
                 data-ad-slot="1234567890"
                 data-ad-format="auto"
                 data-full-width-responsive="true">
            </ins>
            
            {/* 광고 로딩 중 표시 */}
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>광고 로딩 중...</p>
            </div>
          </div>
        </div>

        {/* 다운로드 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>무료 서비스 제공을 위해 광고가 표시됩니다.</strong><br/>
                {showCloseButton ? '이제 다운로드할 수 있습니다!' : `${countdown}초 후 다운로드가 가능합니다.`}
              </p>
            </div>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        {showCloseButton && (
          <div className="text-center mt-6">
            <button
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              📥 지금 다운로드하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferWall;
