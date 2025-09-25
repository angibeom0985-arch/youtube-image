import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Character, StoryboardImage as StoryboardImageType } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import CharacterCard from './components/CharacterCard';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';
import AdBanner from './components/AdBanner';
import InterstitialAd from './components/InterstitialAd';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [personaInput, setPersonaInput] = useState<string>(''); // 페르소나 생성용 입력
    const [storyboardScript, setStoryboardScript] = useState<string>(''); // 스토리보드용 대본
    const [characters, setCharacters] = useState<Character[]>([]);
    const [storyboard, setStoryboard] = useState<StoryboardImageType[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
    const [isLoadingStoryboard, setIsLoadingStoryboard] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showInterstitialAd, setShowInterstitialAd] = useState<boolean>(false);

    const handleGeneratePersonas = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!personaInput.trim()) {
            setError('캐릭터 설명 또는 대본을 입력해주세요.');
            return;
        }
        setIsLoadingCharacters(true);
        setError(null);
        setCharacters([]);

        try {
            const generatedCharacters = await geminiService.generateCharacters(personaInput, apiKey);
            if (generatedCharacters.length === 0) {
                setError('캐릭터 생성에 실패했습니다. 다른 캐릭터 설명으로 다시 시도해보세요.');
            } else {
                setCharacters(generatedCharacters);
                if (generatedCharacters.length < 3) { // 일부만 성공한 경우
                    setError(`일부 캐릭터만 생성되었습니다 (${generatedCharacters.length}개). 일부 캐릭터는 콘텐츠 정책으로 인해 생성되지 않았을 수 있습니다.`);
                }
            }
        } catch (e) {
            console.error(e);
            let errorMessage = '캐릭터 생성 중 오류가 발생했습니다.';
            
            if (e instanceof Error) {
                if (e.message.includes('content policy') || e.message.includes('policy restrictions')) {
                    errorMessage = '콘텐츠 정책 위반으로 이미지 생성이 실패했습니다. 캐릭터 설명을 더 일반적이고 긍정적인 내용으로 수정해보세요.';
                } else if (e.message.includes('API 키')) {
                    errorMessage = 'API 키 오류입니다. 올바른 Google Gemini API 키를 입력했는지 확인해주세요.';
                } else if (e.message.includes('quota') || e.message.includes('limit')) {
                    errorMessage = 'API 사용량이 한계에 도달했습니다. 잠시 후 다시 시도해주세요.';
                } else {
                    errorMessage = e.message;
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsLoadingCharacters(false);
        }
    }, [personaInput, apiKey]);

    const handleRegenerateCharacter = useCallback(async (characterId: string, description: string, name: string) => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        try {
            const newImage = await geminiService.regenerateCharacterImage(description, name, apiKey);
            setCharacters(prev =>
                prev.map(char =>
                    char.id === characterId ? { ...char, image: newImage } : char
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '캐릭터 이미지 재생성에 실패했습니다.');
        }
    }, [apiKey]);

    const handleGenerateStoryboard = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!storyboardScript.trim()) {
            setError('스토리보드 생성을 위한 대본을 입력해주세요.');
            return;
        }
        if (characters.length === 0) {
            setError('먼저 캐릭터를 생성한 후 스토리보드를 만들어주세요.');
            return;
        }
        setIsLoadingStoryboard(true);
        setError(null);
        setStoryboard([]);

        try {
            const generatedStoryboard = await geminiService.generateStoryboard(storyboardScript, characters, imageCount, apiKey);
            setStoryboard(generatedStoryboard.filter(item => item.image)); // Filter out any failed generations
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '스토리보드 생성 중 알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsLoadingStoryboard(false);
        }
    }, [storyboardScript, characters, imageCount, apiKey]);

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

        // 전면광고 표시
        setShowInterstitialAd(true);
    }, [storyboard]);

    const handleAdCompleted = useCallback(async () => {
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
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-600">
                        <h2 className="text-2xl font-bold mb-4 text-blue-300 flex items-center">
                            <span className="mr-2">1️⃣</span>
                            API 키 입력
                        </h2>
                        <div className="flex gap-4">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Google Gemini API 키를 입력하세요..."
                                className="flex-1 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            />
                            <a 
                                href="/guides/api-key-guide.html" 
                                target="_blank"
                                className="px-4 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                            >
                                📚 발급 방법
                            </a>
                        </div>
                    </section>

                    <AdBanner />

                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-purple-300 flex items-center">
                            <span className="mr-2">2️⃣</span>
                            페르소나 생성
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                구체적인 인물 묘사를 입력하거나, 대본을 넣으면 등장인물들을 자동으로 분석하여 생성합니다.
                            </p>
                            <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4 mb-4">
                                <p className="text-purple-200 text-sm mb-2"><strong>입력 예시:</strong></p>
                                <ul className="text-purple-300 text-sm space-y-1 ml-4">
                                    <li>• <strong>인물 묘사:</strong> "20대 중반 여성, 긴 흑발, 밝은 미소, 캐주얼한 옷차림"</li>
                                    <li>• <strong>대본 입력:</strong> 전체 스토리 대본을 넣으면 등장인물 자동 추출</li>
                                </ul>
                            </div>
                        </div>
                        <textarea
                            value={personaInput}
                            onChange={(e) => setPersonaInput(e.target.value)}
                            placeholder="인물 묘사나 대본을 입력하세요..."
                            className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-y"
                        />
                        <button
                            onClick={handleGeneratePersonas}
                            disabled={isLoadingCharacters || !personaInput.trim() || !apiKey.trim()}
                            className="mt-4 w-full sm:w-auto px-6 py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                        >
                            {isLoadingCharacters ? <><Spinner size="sm" /> <span className="ml-2">페르소나 생성 중...</span></> : '페르소나 생성'}
                        </button>
                    </section>

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-red-400 text-xl mr-3">⚠️</span>
                                <div className="flex-1">
                                    <p className="font-medium mb-2">{error}</p>
                                    {error.includes('content policy') || error.includes('policy restrictions') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>해결 방법:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>• 캐릭터 이름을 더 일반적으로 변경 (예: "미스터리한 공범" → "신비로운 인물")</li>
                                                <li>• 부정적인 단어 제거 (범죄, 악역, 위험한 등)</li>
                                                <li>• 더 중성적이고 긍정적인 표현 사용</li>
                                                <li>• 구체적인 외모 특징에 집중</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('API 키') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>해결 방법:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>• <a href="/guides/api-key-guide.html" target="_blank" className="underline hover:text-red-100">API 키 발급 가이드</a>를 참고하여 올바른 키 입력</li>
                                                <li>• Google AI Studio에서 새 키 생성</li>
                                                <li>• 키 입력 시 공백이나 특수문자 포함 여부 확인</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('quota') || error.includes('limit') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>해결 방법:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>• 5-10분 후 다시 시도</li>
                                                <li>• 한 번에 생성할 이미지 수를 줄여보세요</li>
                                                <li>• Google Cloud Console에서 할당량 확인</li>
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoadingCharacters && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">등장인물을 분석하고 이미지를 생성하고 있습니다... 잠시만 기다려 주세요.</p>
                        </div>
                    )}

                    {characters.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-purple-300">생성된 페르소나</h2>
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
                            <h2 className="text-2xl font-bold mb-4 text-green-300 flex items-center">
                                <span className="mr-2">3️⃣</span>
                                스토리보드 생성
                            </h2>
                            <div className="mb-4">
                                <p className="text-gray-400 text-sm mb-3">
                                    위에서 생성한 페르소나를 활용하여 스토리보드를 만듭니다. 대본을 입력해주세요.
                                </p>
                            </div>
                            <textarea
                                value={storyboardScript}
                                onChange={(e) => setStoryboardScript(e.target.value)}
                                placeholder="스토리보드용 대본을 입력하세요..."
                                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-y mb-4"
                            />
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
                                    disabled={isLoadingStoryboard || !storyboardScript.trim() || !apiKey.trim()}
                                    className="w-full sm:w-auto px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
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

                {/* 전면광고 */}
                <InterstitialAd
                    isOpen={showInterstitialAd}
                    onClose={() => setShowInterstitialAd(false)}
                    onAdCompleted={handleAdCompleted}
                />
            </div>
        </div>
    );
};

export default App;