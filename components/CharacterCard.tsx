import React, { useState } from "react";
import { Character } from "../types";
import Spinner from "./Spinner";

interface CharacterCardProps {
  character: Character;
  onRegenerate: (
    characterId: string,
    description: string,
    name: string,
    customPrompt?: string
  ) => void;
}

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-3.181-3.183l-3.181-3.183a8.25 8.25 0 00-11.664 0l-3.181 3.183"
    />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onRegenerate,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // 쿠팡파트너스 링크 랜덤 선택 함수
  const openRandomCoupangLink = () => {
    const coupangLinks = [
      "https://link.coupang.com/a/cT5vZN",
      "https://link.coupang.com/a/cT5v5P",
      "https://link.coupang.com/a/cT5v8V",
      "https://link.coupang.com/a/cT5wcC",
      "https://link.coupang.com/a/cT5wgX",
    ];

    const randomLink =
      coupangLinks[Math.floor(Math.random() * coupangLinks.length)];
    window.open(randomLink, "_blank");
  };

  const handleRegenerateClick = () => {
    setShowCustomPrompt(true);
  };

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    setShowCustomPrompt(false);
    await onRegenerate(
      character.id,
      character.description,
      character.name,
      customPrompt.trim() || undefined
    );
    setIsRegenerating(false);
    setCustomPrompt("");
  };

  const handleCancelRegenerate = () => {
    setShowCustomPrompt(false);
    setCustomPrompt("");
  };

  const handleDownloadClick = () => {
    // 쿠팡파트너스 링크를 새창으로 열기
    openRandomCoupangLink();
    window
      .open("", "", "width=320,height=180")
      .document.write(
        '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>알림</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;background:#18181b;color:#fff;}</style></head><body>이미지가 다운로드되었습니다.</body></html>'
      );
  };

  const handleImageClick = () => {
    // 새창에서 이미지 열기
    const imageWindow = window.open(
      "",
      "_blank",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );
    if (imageWindow) {
      imageWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${character.name} - 페르소나 이미지</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            background: #1a1a1a;
                            color: white;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            min-height: 100vh;
                        }
                        .image-container {
                            max-width: 100%;
                            text-align: center;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                            border-radius: 10px;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        }
                        .info {
                            margin-top: 20px;
                            text-align: center;
                        }
                        .name {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 10px;
                            color: #66d9ef;
                        }
                        .description {
                            font-size: 16px;
                            line-height: 1.5;
                            color: #ccc;
                            max-width: 600px;
                        }
                    </style>
                </head>
                <body>
                    <div class="image-container">
                        <img src="data:image/jpeg;base64,${character.image}" alt="${character.name}">
                        <div class="info">
                            <div class="name">${character.name}</div>
                            <div class="description">${character.description}</div>
                        </div>
                    </div>
                </body>
                </html>
            `);
      imageWindow.document.close();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="relative group">
        <img
          src={`data:image/jpeg;base64,${character.image}`}
          alt={character.name}
          className="w-full h-72 object-cover cursor-pointer"
          onClick={handleImageClick}
        />
        {isRegenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        {!isRegenerating && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleDownloadClick}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label={`Download image for ${character.name}`}
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleRegenerateClick}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label={`Regenerate image for ${character.name}`}
            >
              <RefreshIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-indigo-300">{character.name}</h3>
        <p className="text-gray-400 mt-2 text-sm">{character.description}</p>
      </div>

      {/* 커스텀 프롬프트 모달 */}
      {showCustomPrompt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelRegenerate}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              원하는 느낌 추가하기
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              추가하고 싶은 느낌이나 스타일을 입력하세요. (선택사항)
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="예: 더 밝은 표정, 빈티지 스타일, 따뜻한 조명..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900"
              maxLength={200}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancelRegenerate}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmRegenerate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCard;
