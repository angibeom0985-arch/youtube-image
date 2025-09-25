import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Character, StoryboardImage as StoryboardImageType } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';
import AdBanner from './components/AdBanner';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [script, setScript] = useState<string>('');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [storyboard, setStoryboard] = useState<StoryboardImageType[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingStoryboard, setIsLoadingStoryboard] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
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
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto px-6 py-12">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-6">
                        유튜브 롱폼 이미지 생성기
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                        AI 기술로 스크립트를 입력하고 일관된 캐릭터와 스토리보드 이미지를 자동 생성하세요
                    </p>
                    
                    {/* Enhanced Action Buttons */}
                    <div className="flex flex-wrap justify-center gap-6">
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                        >
                            <span className="mr-3 text-2xl">�</span>
                            API 키 발급 가이드
                            <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
                        </a>
                        <button
                            className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-2xl text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentStep(2);
                                document.getElementById('usage-guide')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            <span className="mr-3 text-2xl">📖</span>
                            사용법 가이드
                            <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
                        </button>
                    </div>
                </header>
                
                {/* Enhanced Progress Steps */}
                <div className="flex justify-center mb-16">
                    <div className="flex items-center space-x-12">
                        <div className={`flex items-center transition-all duration-500 ${currentStep >= 1 ? 'text-blue-400 scale-110' : 'text-gray-500'}`}>
                            <div className={`rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold mr-4 transition-all duration-500 ${currentStep >= 1 ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30' : 'bg-gray-700 shadow-lg'}`}>
                                1
                            </div>
                            <div>
                                <div className="font-bold text-lg">API 키 설정</div>
                                <div className="text-sm opacity-70">Google AI Studio</div>
                            </div>
                        </div>
                        
                        <div className={`text-3xl transition-all duration-500 ${currentStep >= 2 ? 'text-purple-400' : 'text-gray-600'}`}>
                            →
                        </div>
                        
                        <div className={`flex items-center transition-all duration-500 ${currentStep >= 2 ? 'text-purple-400 scale-110' : 'text-gray-500'}`}>
                            <div className={`rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold mr-4 transition-all duration-500 ${currentStep >= 2 ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-xl shadow-purple-500/30' : 'bg-gray-700 shadow-lg'}`}>
                                2
                            </div>
                            <div>
                                <div className="font-bold text-lg">스크립트 입력</div>
                                <div className="text-sm opacity-70">콘텐츠 대본</div>
                            </div>
                        </div>
                        
                        <div className={`text-3xl transition-all duration-500 ${currentStep >= 3 ? 'text-pink-400' : 'text-gray-600'}`}>
                            →
                        </div>
                        
                        <div className={`flex items-center transition-all duration-500 ${currentStep >= 3 ? 'text-pink-400 scale-110' : 'text-gray-500'}`}>
                            <div className={`rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold mr-4 transition-all duration-500 ${currentStep >= 3 ? 'bg-gradient-to-br from-pink-500 to-pink-600 shadow-xl shadow-pink-500/30' : 'bg-gray-700 shadow-lg'}`}>
                                3
                            </div>
                            <div>
                                <div className="font-bold text-lg">스토리보드 생성</div>
                                <div className="text-sm opacity-70">이미지 제작</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <main className="space-y-10">
                    {/* Step 1: Enhanced API Key Setup */}
                    <section className={`relative overflow-hidden rounded-3xl transition-all duration-700 ${currentStep === 1 ? 'bg-gradient-to-r from-blue-900/40 to-blue-800/40 border-2 border-blue-400/50 shadow-2xl shadow-blue-500/20 scale-105' : 'bg-gray-800/50 border border-gray-600/50 shadow-xl'}`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-50"></div>
                        <div className="relative p-8">
                            <div className="flex items-center mb-6">
                                <div className="text-5xl mr-5 animate-pulse">�</div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">
                                        1. API 키 설정
                                    </h2>
                                    <p className="text-blue-200/80">Google AI Studio에서 발급받은 API 키를 입력하세요</p>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        if (e.target.value.trim() && currentStep < 2) setCurrentStep(2);
                                    }}
                                    placeholder="AIzaSy... (API 키를 입력하세요)"
                                    className="w-full p-5 text-lg bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 backdrop-blur-sm"
                                />
                            </div>
                            
                            <div className="bg-blue-900/30 rounded-2xl p-4 border border-blue-500/20">
                                <div className="flex items-start">
                                    <span className="text-2xl mr-3 mt-1">💡</span>
                                    <div className="text-blue-100 text-sm">
                                        <p className="mb-2 font-medium">API 키 발급 안내:</p>
                                        <ul className="space-y-1 text-blue-200/80">
                                            <li>• Google AI Studio에서 무료로 발급</li>
                                            <li>• 월 1,500건 무료 사용 가능</li>
                                            <li>• 브라우저에만 저장되어 안전</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
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