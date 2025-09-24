import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Character, StoryboardImage as StoryboardImageType } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import CharacterCard from './components/CharacterCard';
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

    // 캐릭터 관련 함수들 제거 - 더 이상 필요하지 않음

    const handleGenerateStoryboard = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!script) {
            setError('대본을 입력해주세요.');
            return;
        }
        setIsLoadingStoryboard(true);
        setError(null);
        setStoryboard([]);

        try {
            // 캐릭터 생성 단계를 건너뛰고 바로 스토리보드 생성
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
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        유튜브 롱폼 이미지 생성기
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">스크립트를 입력하고 일관된 캐릭터와 스토리보드 이미지를 생성하세요!</p>
                    
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
                
                <main className="space-y-12">
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-yellow-600">
                        <h2 className="text-2xl font-bold mb-4 text-yellow-300 flex items-center">
                            <span className="mr-2">🔑</span>
                            API 키 설정
                        </h2>
                        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                            <p className="text-yellow-200 text-sm mb-2">
                                <strong>Google AI Studio API 키가 필요합니다:</strong>
                            </p>
                            <ol className="text-yellow-300 text-sm space-y-1 ml-4">
                                <li>1. <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>에 접속</li>
                                <li>2. "Get API key" 클릭하여 무료 API 키 생성</li>
                                <li>3. 아래에 API 키를 입력하세요</li>
                                <li>4. <a href="/guides/api-key-guide.html" className="text-blue-400 hover:underline">자세한 발급 방법 보기</a></li>
                            </ol>
                        </div>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Google Gemini API 키를 입력하세요..."
                            className="w-full p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200"
                        />
                    </section>

                    <AdBanner />

                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">1. 대본 입력</h2>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="여기에 이야기 대본을 붙여넣으세요..."
                            className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-y"
                        />
                        <button
                            onClick={handleGeneratePersonas}
                            disabled={isLoadingCharacters || !script || !apiKey.trim()}
                            className="mt-4 w-full sm:w-auto px-6 py-3 bg-indigo-600 font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                        >
                            {isLoadingCharacters ? <><Spinner size="sm" /> <span className="ml-2">페르소나 생성 중...</span></> : '페르소나 생성'}
                        </button>
                    </section>

                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">{error}</div>}

                    {isLoadingCharacters && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">등장인물을 분석하고 이미지를 생성하고 있습니다... 잠시만 기다려 주세요.</p>
                        </div>
                    )}

                    {characters.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-indigo-300">등장인물 페르소나</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {characters.map(char => (
                                    <CharacterCard key={char.id} character={char} onRegenerate={handleRegenerateCharacter} />
                                ))}
                            </div>
                        </section>
                    )}

                    {characters.length > 0 && <AdBanner />}

                    {characters.length > 0 && (
                        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                            <h2 className="text-2xl font-bold mb-4 text-indigo-300">2. 스토리보드 생성</h2>
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
                                    disabled={isLoadingStoryboard}
                                    className="w-full sm:w-auto px-6 py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                                >
                                    {isLoadingStoryboard ? <><Spinner size="sm" /> <span className="ml-2">스토리보드 생성 중...</span></> : '스토리보드 생성'}
                                </button>
                            </div>
                        </section>
                    )}

                     {isLoadingStoryboard && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">장면을 만들고 있습니다... 이 작업은 시간이 걸릴 수 있습니다.</p>
                        </div>
                    )}
                    
                    {storyboard.length > 0 && (
                        <section>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-2xl font-bold text-indigo-300">생성된 스토리보드</h2>
                                <button
                                    onClick={handleDownloadAllImages}
                                    disabled={isDownloading}
                                    className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                >
                                    {isDownloading ? <><Spinner size="sm" /><span className="ml-2">압축 중...</span></> : '모든 이미지 저장'}
                                </button>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {storyboard.map((item) => (
                                    <StoryboardImage key={item.id} item={item} onRegenerate={handleRegenerateStoryboardImage} />
                                ))}
                            </div>
                        </section>
                    )}

                    {storyboard.length > 0 && <AdBanner />}
                </main>
            </div>
        </div>
    );
};

export default App;