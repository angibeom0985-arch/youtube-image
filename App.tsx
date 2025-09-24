import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Character, StoryboardImage as StoryboardImageType } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';
import AdBanner from './components/AdBanner';
import OfferWall from './components/OfferWall';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [script, setScript] = useState<string>('');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [storyboard, setStoryboard] = useState<StoryboardImageType[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingStoryboard, setIsLoadingStoryboard] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showOfferWall, setShowOfferWall] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(1);

    const handleGenerateStoryboard = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!script.trim()) {
            setError('대본을 입력해주세요.');
            return;
        }
        setIsLoadingStoryboard(true);
        setError(null);
        setStoryboard([]);
        setCharacters([]);

        try {
            // 캐릭터 생성과 스토리보드 생성을 한 번에 처리
            const generatedCharacters = await geminiService.generateCharacters(script, apiKey);
            setCharacters(generatedCharacters);
            
            const generatedStoryboard = await geminiService.generateStoryboard(script, generatedCharacters, imageCount, apiKey);
            setStoryboard(generatedStoryboard.filter(item => item.image));
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '스토리보드 생성 중 알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsLoadingStoryboard(false);
        }
    }, [script, imageCount, apiKey]);

    const handleRegenerateStoryboardImage = useCallback(async (storyboardItemId: string) => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        const itemToRegenerate = storyboard.find(item => item.id === storyboardItemId);
        if (!itemToRegenerate) return;

        try {
            const newImage = await geminiService.regenerateStoryboardImage(
                itemToRegenerate.sceneDescription,
                characters,
                apiKey
            );
            setStoryboard(prev =>
                prev.map(item =>
                    item.id === storyboardItemId ? { ...item, image: newImage } : item
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '스토리보드 이미지 재생성에 실패했습니다.');
        }
    }, [storyboard, characters, apiKey]);

    const handleDownloadAllImages = useCallback(async () => {
        if (storyboard.length === 0) return;
        // 오퍼월 광고 표시
        setShowOfferWall(true);
    }, [storyboard]);

    const handleOfferWallComplete = useCallback(async () => {
        setIsDownloading(true);
        setError(null);
        try {
            const zip = new JSZip();
            storyboard.forEach((item, index) => {
                const safeDescription = item.sceneDescription.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '_').substring(0, 30);
                const fileName = `scene_${index + 1}_${safeDescription}.jpeg`;
                zip.file(fileName, item.image, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'storyboard.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (e) {
            console.error("Failed to create zip file", e);
            setError("ZIP 파일 다운로드에 실패했습니다.");
        } finally {
            setIsDownloading(false);
        }
    }, [storyboard]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
            {/* 오퍼월 광고 */}
            {showOfferWall && (
                <OfferWall 
                    onClose={() => setShowOfferWall(false)}
                    onAdCompleted={handleOfferWallComplete}
                />
            )}
            
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        유튜브 롱폼 이미지 생성기
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">대본을 입력하고 페르소나 이미지와 영상 소스로 사용할 이미지를 최대 40장 생성하세요!</p>
                    
                    {/* 네비게이션 링크 */}
                    <div className="flex justify-center mt-4 space-x-4">
                        <a 
                            href="/guides/api-key-guide.html" 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            📚 API 키 발급 가이드
                        </a>
                        <a 
                            href="/guides/user-guide.html" 
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            📖 사용법 가이드
                        </a>
                    </div>
                </header>
                
                {/* 진행 단계 표시 */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-400' : 'text-gray-600'}`}>
                            <div className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-2 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-600'}`}>1</div>
                            API 키 설정
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className={`flex items-center ${currentStep >= 2 ? 'text-green-400' : 'text-gray-600'}`}>
                            <div className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-2 ${currentStep >= 2 ? 'bg-green-600' : 'bg-gray-600'}`}>2</div>
                            대본 입력
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className={`flex items-center ${currentStep >= 3 ? 'text-purple-400' : 'text-gray-600'}`}>
                            <div className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-2 ${currentStep >= 3 ? 'bg-purple-600' : 'bg-gray-600'}`}>3</div>
                            스토리보드 생성
                        </div>
                    </div>
                </div>
                
                <main className="space-y-8">
                    {/* 1단계: API 키 설정 */}
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 flex items-center">
                            <span className="mr-2">🔑</span>
                            1. API 키 설정
                        </h2>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                if (e.target.value.trim() && currentStep < 2) setCurrentStep(2);
                            }}
                            placeholder="Google Gemini API 키를 입력하세요..."
                            className="w-full p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        />
                        {!apiKey.trim() && (
                            <p className="text-gray-400 text-sm mt-2">
                                API 키가 필요합니다. <a href="/guides/api-key-guide.html" className="text-blue-400 hover:underline">발급 방법 보기</a>
                            </p>
                        )}
                    </section>

                    <AdBanner />

                    {/* 2단계: 대본 입력 */}
                    {currentStep >= 2 && (
                        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                            <h2 className="text-2xl font-bold mb-4 text-green-300 flex items-center">
                                <span className="mr-2">📝</span>
                                2. 대본 입력
                            </h2>
                            <textarea
                                value={script}
                                onChange={(e) => {
                                    setScript(e.target.value);
                                    if (e.target.value.trim() && apiKey.trim() && currentStep < 3) setCurrentStep(3);
                                }}
                                placeholder="여기에 유튜브 영상의 스크립트나 스토리를 입력하세요..."
                                className="w-full h-32 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-y"
                            />
                        </section>
                    )}

                    {/* 3단계: 스토리보드 생성 */}
                    {currentStep >= 3 && (
                        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                            <h2 className="text-2xl font-bold mb-4 text-purple-300 flex items-center">
                                <span className="mr-2">🎬</span>
                                3. 스토리보드 생성
                            </h2>
                            <div className="space-y-4">
                                <Slider 
                                    label="생성할 이미지 수"
                                    min={5}
                                    max={40}
                                    value={imageCount}
                                    onChange={(e) => setImageCount(parseInt(e.target.value))}
                                />
                                <button
                                    onClick={handleGenerateStoryboard}
                                    disabled={isLoadingStoryboard || !script.trim() || !apiKey.trim()}
                                    className="w-full px-6 py-4 bg-purple-600 font-semibold text-lg rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                >
                                    {isLoadingStoryboard ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span className="ml-2">스토리보드 생성 중...</span>
                                        </>
                                    ) : (
                                        '🚀 스토리보드 생성하기'
                                    )}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* 오류 메시지 */}
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* 로딩 상태 */}
                    {isLoadingStoryboard && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">캐릭터 분석 및 스토리보드 이미지를 생성하고 있습니다... 잠시만 기다려 주세요.</p>
                        </div>
                    )}

                    {/* 생성된 스토리보드 */}
                    {storyboard.length > 0 && (
                        <>
                            <section>
                                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                                    <h2 className="text-2xl font-bold text-indigo-300">생성된 스토리보드</h2>
                                    <button
                                        onClick={handleDownloadAllImages}
                                        disabled={isDownloading}
                                        className="px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <Spinner size="sm" />
                                                <span className="ml-2">압축 중...</span>
                                            </>
                                        ) : (
                                            '📥 모든 이미지 다운로드'
                                        )}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {storyboard.map((item) => (
                                        <StoryboardImage 
                                            key={item.id} 
                                            item={item} 
                                            onRegenerate={handleRegenerateStoryboardImage} 
                                        />
                                    ))}
                                </div>
                            </section>
                            <AdBanner />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;