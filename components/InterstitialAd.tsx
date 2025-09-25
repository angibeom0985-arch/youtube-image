import React, { useState } from 'react';

interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
}

const InterstitialAd: React.FC<InterstitialAdProps> = ({ isOpen, onClose, onAdCompleted }) => {
  const [countdown, setCountdown] = useState(5);
  const [adCompleted, setAdCompleted] = useState(false);

  React.useEffect(() => {
    if (isOpen && !adCompleted) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setAdCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, adCompleted]);

  React.useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setAdCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkipAd = () => {
    onAdCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full max-w-4xl mx-4">
        {/* 광고 콘텐츠 영역 */}
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-xl p-8 text-white text-center">
          {/* 닫기 버튼 (광고 완료 후에만 표시) */}
          {adCompleted && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕
            </button>
          )}

          {/* 광고 내용 */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-4">🎬 더 많은 기능을 원하시나요?</h2>
            <p className="text-xl mb-6">프리미엄 버전에서 더욱 강력한 기능을 경험해보세요!</p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-bold mb-2">무제한 생성</h3>
                <p className="text-sm">이미지 생성 횟수 제한 없음</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-2xl mb-2">🎨</div>
                <h3 className="font-bold mb-2">고급 스타일</h3>
                <p className="text-sm">더 다양한 아트 스타일 지원</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-bold mb-2">대량 처리</h3>
                <p className="text-sm">최대 100장까지 한번에 생성</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 rounded-lg font-bold transition-all">
                프리미엄 체험하기
              </button>
              <button className="border border-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-bold transition-all">
                더 알아보기
              </button>
            </div>
          </div>

          {/* 카운트다운 또는 스킵 버튼 */}
          <div className="border-t border-white border-opacity-20 pt-4">
            {!adCompleted ? (
              <div className="text-sm text-gray-300">
                광고가 {countdown}초 후에 닫힙니다...
              </div>
            ) : (
              <button
                onClick={handleSkipAd}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold transition-all"
              >
                다운로드 계속하기 →
              </button>
            )}
          </div>
        </div>

        {/* Google AdSense 광고 영역 (실제 광고로 대체 가능) */}
        <div className="mt-4 bg-gray-800 rounded-lg p-4 text-center">
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client="ca-pub-2686975437928535"
               data-ad-slot="1234567890"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      </div>
    </div>
  );
};

export default InterstitialAd;