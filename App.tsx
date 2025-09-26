import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { Character, VideoSourceImage } from './types';
import * as geminiService from './services/geminiService';
import { detectUnsafeWords, replaceUnsafeWords, isTextSafe } from './utils/contentSafety';
import { saveApiKey, loadApiKey, clearApiKey, isRememberMeEnabled } from './utils/apiKeyStorage';
import Spinner from './components/Spinner';
import CharacterCard from './components/CharacterCard';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';
import AdBanner from './components/AdBanner';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [rememberApiKey, setRememberApiKey] = useState<boolean>(true);
    const [imageStyle, setImageStyle] = useState<'realistic' | 'animation'>('realistic'); // 이미지 스타일 선택
    const [personaInput, setPersonaInput] = useState<string>(''); // 페르소나 생성용 입력
    const [videoSourceScript, setVideoSourceScript] = useState<string>(''); // 영상 소스용 대본
    const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(true); // 자막 포함 여부
    const [referenceImage, setReferenceImage] = useState<string | null>(null); // 일관성 유지를 위한 참조 이미지
    const [characters, setCharacters] = useState<Character[]>([]);
    const [videoSource, setVideoSource] = useState<VideoSourceImage[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
    const [isLoadingVideoSource, setIsLoadingVideoSource] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [contentWarning, setContentWarning] = useState<{
        unsafeWords: string[];
        replacements: Array<{original: string; replacement: string}>;
    } | null>(null);

    // 컴포넌트 마운트 시 저장된 API 키 로딩
    useEffect(() => {
        const savedApiKey = loadApiKey();
        if (savedApiKey) {
            setApiKey(savedApiKey);
            setRememberApiKey(isRememberMeEnabled());
        }
    }, []);

    // API 키 변경 시 자동 저장
    const handleApiKeyChange = useCallback((newApiKey: string) => {
        setApiKey(newApiKey);
        if (newApiKey.trim()) {
            saveApiKey(newApiKey, rememberApiKey);
        }
    }, [rememberApiKey]);

    // Remember Me 설정 변경
    const handleRememberMeChange = useCallback((remember: boolean) => {
        setRememberApiKey(remember);
        if (apiKey.trim()) {
            saveApiKey(apiKey, remember);
        }
    }, [apiKey]);

    // API 키 삭제
    const handleClearApiKey = useCallback(() => {
        clearApiKey();
        setApiKey('');
        setRememberApiKey(true);
    }, []);

    // 참조 이미지 업로드 핸들러
    const handleReferenceImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    const base64Data = result.split(',')[1]; // data:image/jpeg;base64, 부분 제거
                    setReferenceImage(base64Data);
                };
                reader.readAsDataURL(file);
            } else {
                setError('이미지 파일만 업로드할 수 있습니다.');
            }
        }
    }, []);

    // 참조 이미지 삭제 핸들러
    const handleRemoveReferenceImage = useCallback(() => {
        setReferenceImage(null);
    }, []);

    // 콘텐츠 안전성 검사 및 자동 교체 함수
    const checkAndReplaceContent = useCallback((text: string) => {
        const unsafeWords = detectUnsafeWords(text);
        if (unsafeWords.length > 0) {
            const { replacedText, replacements } = replaceUnsafeWords(text);
            setContentWarning({ unsafeWords, replacements });
            return replacedText;
        }
        setContentWarning(null);
        return text;
    }, []);

    // 안전한 단어로 자동 교체 버튼 핸들러
    const handleAutoReplace = useCallback(() => {
        if (contentWarning) {
            const { replacedText } = replaceUnsafeWords(personaInput);
            setPersonaInput(replacedText);
            setContentWarning(null);
        }
    }, [personaInput, contentWarning]);

    const handleGeneratePersonas = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!personaInput.trim()) {
            setError('캐릭터 설명 또는 대본을 입력해주세요.');
            return;
        }
        
        // 콘텐츠 안전성 검사 및 자동 교체
        const safeInput = checkAndReplaceContent(personaInput);
        
        setIsLoadingCharacters(true);
        setError(null);
        setCharacters([]);

        try {
            const generatedCharacters = await geminiService.generateCharacters(safeInput, apiKey, imageStyle);
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
    }, [personaInput, apiKey, imageStyle]);

    const handleRegenerateCharacter = useCallback(async (characterId: string, description: string, name: string) => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        try {
            const newImage = await geminiService.regenerateCharacterImage(description, name, apiKey, imageStyle);
            setCharacters(prev =>
                prev.map(char =>
                    char.id === characterId ? { ...char, image: newImage } : char
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '캐릭터 이미지 재생성에 실패했습니다.');
        }
    }, [apiKey, imageStyle]);

    const handleGenerateVideoSource = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        if (!videoSourceScript.trim()) {
            setError('영상 소스 생성을 위한 대본을 입력해주세요.');
            return;
        }
        if (characters.length === 0) {
            setError('먼저 캐릭터를 생성한 후 영상 소스를 만들어주세요.');
            return;
        }

        // 이미지 개수 제한 안내
        const limitedImageCount = Math.min(imageCount, 20);
        if (imageCount > 20) {
            setError('안정적인 생성을 위해 이미지 개수는 최대 20개로 제한됩니다.');
            setImageCount(20);
            return;
        }

        setIsLoadingVideoSource(true);
        setError(null);
        setVideoSource([]);

        try {
            console.log(`영상 소스 ${limitedImageCount}개 생성을 시작합니다...`);
            const generatedVideoSource = await geminiService.generateStoryboard(videoSourceScript, characters, limitedImageCount, apiKey, imageStyle, subtitleEnabled, referenceImage);
            
            // 성공한 이미지만 필터링
            const successfulImages = generatedVideoSource.filter(item => item.image && item.image.trim() !== '');
            const failedCount = generatedVideoSource.length - successfulImages.length;
            
            setVideoSource(successfulImages);
            
            if (failedCount > 0) {
                setError(`${successfulImages.length}개의 이미지가 생성되었습니다. ${failedCount}개는 생성에 실패했습니다. 대본을 수정하거나 다시 시도해보세요.`);
            } else if (successfulImages.length === 0) {
                setError('모든 이미지 생성에 실패했습니다. API 키를 확인하거나 대본을 수정한 후 다시 시도해보세요.');
            } else {
                console.log(`${successfulImages.length}개의 영상 소스 이미지가 성공적으로 생성되었습니다.`);
            }
        } catch (e) {
            console.error('영상 소스 생성 오류:', e);
            if (e instanceof Error) {
                if (e.message.includes('API')) {
                    setError('API 호출에 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해보세요.');
                } else if (e.message.includes('quota') || e.message.includes('limit')) {
                    setError('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 이미지 개수를 줄여보세요.');
                } else {
                    setError(e.message);
                }
            } else {
                setError('영상 소스 생성 중 알 수 없는 오류가 발생했습니다. 다시 시도해보세요.');
            }
        } finally {
            setIsLoadingVideoSource(false);
        }
    }, [videoSourceScript, characters, imageCount, apiKey, imageStyle, subtitleEnabled, referenceImage]);

    const handleRegenerateVideoSourceImage = useCallback(async (videoSourceItemId: string) => {
        if (!apiKey.trim()) {
            setError('Google Gemini API 키를 입력해주세요.');
            return;
        }
        const itemToRegenerate = videoSource.find(item => item.id === videoSourceItemId);
        if (!itemToRegenerate) return;

        try {
            const newImage = await geminiService.regenerateStoryboardImage(
                itemToRegenerate.sceneDescription,
                characters,
                apiKey,
                imageStyle,
                subtitleEnabled,
                referenceImage
            );
            setVideoSource(prev =>
                prev.map(item =>
                    item.id === videoSourceItemId ? { ...item, image: newImage } : item
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '영상 소스 이미지 재생성에 실패했습니다.');
        }
    }, [videoSource, characters, apiKey, imageStyle, subtitleEnabled, referenceImage]);

    const handleDownloadAllImages = useCallback(async () => {
        if (videoSource.length === 0) return;

        setIsDownloading(true);
        setError(null);
        try {
            const zip = new JSZip();
            videoSource.forEach((item, index) => {
                const safeDescription = item.sceneDescription.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '_').substring(0, 30);
                const fileName = `scene_${index + 1}_${safeDescription}.jpeg`;
                zip.file(fileName, item.image, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'video_sources.zip';
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
    }, [videoSource]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        유튜브 롱폼 이미지 생성기
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">스크립트를 입력하고 일관된 캐릭터와 영상 소스 이미지를 생성하세요!</p>
                    
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
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => handleApiKeyChange(e.target.value)}
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
                            
                            {/* API 키 저장 옵션 */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={rememberApiKey}
                                        onChange={(e) => handleRememberMeChange(e.target.checked)}
                                        className="mr-2 w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm">
                                        API 키 기억하기 
                                        <span className="text-gray-400 text-xs ml-1">
                                            ({rememberApiKey ? '브라우저에 암호화 저장' : '탭 닫으면 삭제'})
                                        </span>
                                    </span>
                                </label>
                                
                                {apiKey && (
                                    <button
                                        onClick={handleClearApiKey}
                                        className="text-red-400 hover:text-red-300 text-sm underline"
                                    >
                                        저장된 키 삭제
                                    </button>
                                )}
                            </div>
                            
                            {/* API 키 보안 안내 */}
                            <div className="bg-gray-900 p-3 rounded-lg border-l-4 border-yellow-500">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <span className="text-yellow-500">🔒</span>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs text-gray-300">
                                            <strong>보안 안내:</strong> API 키는 {rememberApiKey ? '암호화되어 브라우저에만' : '현재 세션에만'} 저장되며, 
                                            외부 서버로 전송되지 않습니다. 공용 컴퓨터에서는 "기억하기"를 해제하는 것을 권장합니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <AdBanner />

                    {/* 이미지 스타일 선택 */}
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center">
                            <span className="mr-2">🎨</span>
                            이미지 스타일 선택
                        </h2>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setImageStyle('realistic')}
                                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                                    imageStyle === 'realistic'
                                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-1">📸</div>
                                    <div>실사 스타일</div>
                                    <div className="text-sm opacity-80 mt-1">사실적인 실제 사진 스타일</div>
                                </div>
                            </button>
                            <button
                                onClick={() => setImageStyle('animation')}
                                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                                    imageStyle === 'animation'
                                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-1">🎭</div>
                                    <div>애니메이션 스타일</div>
                                    <div className="text-sm opacity-80 mt-1">밝고 컬러풀한 만화/애니메이션 스타일</div>
                                </div>
                            </button>
                        </div>
                    </section>

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
                        
                        {/* 콘텐츠 정책 위반 경고 */}
                        {contentWarning && (
                            <div className="mt-4 bg-orange-900/50 border border-orange-500 text-orange-300 p-4 rounded-lg">
                                <div className="flex items-start">
                                    <span className="text-orange-400 text-xl mr-3">⚠️</span>
                                    <div className="flex-1">
                                        <p className="font-medium mb-2">콘텐츠 정책 위반 가능성이 있는 단어가 감지되었습니다</p>
                                        <div className="mb-3">
                                            <p className="text-sm text-orange-200 mb-2">감지된 단어:</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {contentWarning.unsafeWords.map((word, index) => (
                                                    <span key={index} className="px-2 py-1 bg-orange-800/50 rounded text-sm">
                                                        "{word}"
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleAutoReplace}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                                            >
                                                🔄 안전한 단어로 자동 교체
                                            </button>
                                            <button
                                                onClick={() => setContentWarning(null)}
                                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                무시하고 계속
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
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

                    {/* 3단계는 항상 표시 */}
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-green-300 flex items-center">
                            <span className="mr-2">3️⃣</span>
                            영상 소스 생성
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                위에서 생성한 페르소나를 활용하여 영상 소스를 만듭니다. 대본을 입력해주세요.
                            </p>
                        </div>
                        <textarea
                            value={videoSourceScript}
                            onChange={(e) => setVideoSourceScript(e.target.value)}
                            placeholder="영상 소스용 대본을 입력하세요..."
                            className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-y mb-4"
                        />
                        
                        {/* 자막 옵션 */}
                        <div className="mb-4 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                            <h3 className="text-green-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">💬</span>
                                자막 설정
                            </h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSubtitleEnabled(true)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                                        subtitleEnabled
                                            ? 'bg-green-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="text-lg mb-1">📝</div>
                                        <div>자막 ON</div>
                                        <div className="text-xs opacity-80 mt-1">한국어 자막 포함</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSubtitleEnabled(false)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                                        !subtitleEnabled
                                            ? 'bg-gray-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="text-lg mb-1">🚫</div>
                                        <div>자막 OFF</div>
                                        <div className="text-xs opacity-80 mt-1">자막 없는 이미지</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 참조 이미지 업로드 */}
                        <div className="mb-4 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                            <h3 className="text-blue-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">🎨</span>
                                일관성 유지 (선택사항)
                            </h3>
                            <p className="text-blue-200 text-sm mb-3">
                                참조 이미지를 업로드하면 해당 이미지의 스타일과 일관성을 유지하며 영상 소스를 생성합니다.
                            </p>
                            
                            {!referenceImage ? (
                                <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 text-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReferenceImageUpload}
                                        className="hidden"
                                        id="referenceImageInput"
                                    />
                                    <label 
                                        htmlFor="referenceImageInput"
                                        className="cursor-pointer flex flex-col items-center space-y-2 hover:text-blue-300 transition-colors"
                                    >
                                        <div className="text-3xl">📸</div>
                                        <div className="text-blue-300 font-medium">참조 이미지 업로드</div>
                                        <div className="text-blue-400 text-sm">클릭하여 이미지를 선택하세요</div>
                                    </label>
                                </div>
                            ) : (
                                <div className="relative bg-gray-900 rounded-lg p-4">
                                    <div className="flex items-center space-x-4">
                                        <img 
                                            src={`data:image/jpeg;base64,${referenceImage}`}
                                            alt="참조 이미지"
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <div className="text-blue-300 font-medium">참조 이미지 업로드됨</div>
                                            <div className="text-blue-400 text-sm">이 이미지의 스타일을 참고하여 영상 소스를 생성합니다</div>
                                        </div>
                                        <button
                                            onClick={handleRemoveReferenceImage}
                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                               <Slider 
                                 label="생성할 이미지 수 (최대 20개 권장)"
                                 min={5}
                                 max={20}
                                 value={Math.min(imageCount, 20)}
                                 onChange={(e) => setImageCount(parseInt(e.target.value))}
                               />
                               <p className="text-gray-500 text-xs">
                                   안정적인 생성을 위해 이미지 개수를 20개로 제한합니다. 더 많은 이미지가 필요하시면 여러 번에 나누어 생성해주세요.
                               </p>
                           </div>
                            <button
                                onClick={handleGenerateVideoSource}
                                disabled={isLoadingVideoSource || !videoSourceScript.trim() || !apiKey.trim()}
                                className="w-full sm:w-auto px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                            >
                                {isLoadingVideoSource ? <><Spinner size="sm" /> <span className="ml-2">영상 소스 생성 중...</span></> : '영상 소스 생성'}
                            </button>
                        </div>
                    </section>

                     {isLoadingVideoSource && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">장면을 만들고 있습니다... 이 작업은 시간이 걸릴 수 있습니다.</p>
                        </div>
                    )}
                    
                    {videoSource.length > 0 && (
                        <section>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-2xl font-bold text-indigo-300">생성된 영상 소스</h2>
                                <button
                                    onClick={handleDownloadAllImages}
                                    disabled={isDownloading}
                                    className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                >
                                    {isDownloading ? <><Spinner size="sm" /><span className="ml-2">압축 중...</span></> : '모든 이미지 저장'}
                                </button>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videoSource.map((item) => (
                                    <StoryboardImage key={item.id} item={item} onRegenerate={handleRegenerateVideoSourceImage} />
                                ))}
                            </div>
                        </section>
                    )}

                    {videoSource.length > 0 && <AdBanner />}
                    
                    {/* 디스플레이 광고 추가 */}
                    <section className="my-8">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg shadow-lg text-center">
                            <h3 className="text-xl font-bold mb-2">🎬 더 많은 영상 제작 도구가 필요하신가요?</h3>
                            <p className="mb-4">프로페셔널한 영상 편집과 효과를 위한 도구들을 확인해보세요!</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="#" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                    🎵 음악 라이브러리
                                </a>
                                <a href="#" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                    🎨 효과 템플릿
                                </a>
                                <a href="#" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                    📊 분석 도구
                                </a>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default App;