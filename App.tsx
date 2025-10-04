import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { Character, VideoSourceImage, AspectRatio, ImageStyle, CharacterStyle, BackgroundStyle, PhotoComposition } from './types';
import * as geminiService from './services/geminiService';
import { testApiKey } from './services/apiTest';
import { detectUnsafeWords, replaceUnsafeWords, isTextSafe } from './utils/contentSafety';
import { saveApiKey, loadApiKey, clearApiKey, isRememberMeEnabled } from './utils/apiKeyStorage';
import Spinner from './components/Spinner';
import CharacterCard from './components/CharacterCard';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';
import MetaTags from './components/MetaTags';
import ApiKeyGuide from './components/ApiKeyGuide';
import UserGuide from './components/UserGuide';
import AdBanner from './components/AdBanner';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'main' | 'api-guide' | 'user-guide' | 'image-prompt'>('main');
    const [apiKey, setApiKey] = useState<string>('');
    const [rememberApiKey, setRememberApiKey] = useState<boolean>(true);
    const [imageStyle, setImageStyle] = useState<'realistic' | 'animation'>('realistic'); // ���� �̹��� ��Ÿ�� (�ǻ�/�ִϸ��̼�)
    const [personaStyle, setPersonaStyle] = useState<ImageStyle>('�ǻ� �ش�ȭ'); // ���� �丣�ҳ� ��Ÿ�� (ȣȯ�� ����)
    const [characterStyle, setCharacterStyle] = useState<CharacterStyle>('�ǻ� �ش�ȭ'); // �ι� ��Ÿ��
    const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('����'); // ����/������ ��Ÿ��
    const [customCharacterStyle, setCustomCharacterStyle] = useState<string>(''); // Ŀ���� �ι� ��Ÿ��
    const [customBackgroundStyle, setCustomBackgroundStyle] = useState<string>(''); // Ŀ���� ���� ��Ÿ��
    const [customStyle, setCustomStyle] = useState<string>(''); // Ŀ���� ��Ÿ�� �Է� (���� ȣȯ��)
    const [photoComposition, setPhotoComposition] = useState<PhotoComposition>('����'); // ���� ����
    const [customPrompt, setCustomPrompt] = useState<string>(''); // Ŀ���� �̹��� ������Ʈ
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9'); // �̹��� ���� ����
    const [personaInput, setPersonaInput] = useState<string>(''); // �丣�ҳ� ������ �Է�
    const [videoSourceScript, setVideoSourceScript] = useState<string>(''); // ���� �ҽ��� �뺻
    const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(false); // �ڸ� ���� ���� - �⺻ OFF
    const [referenceImage, setReferenceImage] = useState<string | null>(null); // �ϰ��� ������ ���� ���� �̹���
    const [characters, setCharacters] = useState<Character[]>([]);
    const [videoSource, setVideoSource] = useState<VideoSourceImage[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
    const [isLoadingVideoSource, setIsLoadingVideoSource] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [personaError, setPersonaError] = useState<string | null>(null);
    const [contentWarning, setContentWarning] = useState<{
        unsafeWords: string[];
        replacements: Array<{original: string; replacement: string}>;
    } | null>(null);
    const [isContentWarningAcknowledged, setIsContentWarningAcknowledged] = useState<boolean>(false);
    const [hasContentWarning, setHasContentWarning] = useState<boolean>(false);
    const [hoveredStyle, setHoveredStyle] = useState<string | null>(null); // ȣ���� ��Ÿ��

    // URL ���� ���� �� ���� �� �������� �׺����̼� ó��
    useEffect(() => {
        const updateViewFromPath = () => {
            const path = decodeURIComponent(window.location.pathname);
            if (path === '/api-guide' || path.includes('api') && path.includes('���̵�')) {
                setCurrentView('api-guide');
            } else if (path === '/user-guide' || path.includes('������') && path.includes('���̵�')) {
                setCurrentView('user-guide');
            } else if (path === '/image-prompt') {
                setCurrentView('image-prompt');
            } else {
                setCurrentView('main');
            }
        };

        // �ʱ� �ε� �� �� ����
        updateViewFromPath();

        // �������� �ڷΰ���/�����ΰ��� ��ư ó��
        const handlePopState = () => {
            updateViewFromPath();
        };

        window.addEventListener('popstate', handlePopState);

        // cleanup
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // ������Ʈ ����Ʈ �� ������ API Ű �ε�
    useEffect(() => {
        const savedApiKey = loadApiKey();
        if (savedApiKey) {
            setApiKey(savedApiKey);
            setRememberApiKey(isRememberMeEnabled());
        }
    }, []);

    // API Ű ���� �� �ڵ� ����
    const handleApiKeyChange = useCallback((newApiKey: string) => {
        setApiKey(newApiKey);
        if (newApiKey.trim()) {
            saveApiKey(newApiKey, rememberApiKey);
        }
    }, [rememberApiKey]);

    // �ǽð� ������ ������ �˻�
    useEffect(() => {
        const checkContent = () => {
            const textToCheck = personaInput + ' ' + videoSourceScript;
            const unsafeWords = detectUnsafeWords(textToCheck);
            
            if (unsafeWords.length > 0) {
                const { replacements } = replaceUnsafeWords(textToCheck);
                setContentWarning({ unsafeWords, replacements });
                setHasContentWarning(true);
                setIsContentWarningAcknowledged(false);
            } else {
                setContentWarning(null);
                setHasContentWarning(false);
                setIsContentWarningAcknowledged(false);
            }
        };

        const debounceTimer = setTimeout(checkContent, 300);
        return () => clearTimeout(debounceTimer);
    }, [personaInput, videoSourceScript]);

    // Remember Me ���� ����
    const handleRememberMeChange = useCallback((remember: boolean) => {
        setRememberApiKey(remember);
        if (apiKey.trim()) {
            saveApiKey(apiKey, remember);
        }
    }, [apiKey]);

    // API Ű ����
    const handleClearApiKey = useCallback(() => {
        clearApiKey();
        setApiKey('');
        setRememberApiKey(true);
    }, []);

    // ���� �̹��� ���ε� �ڵ鷯
    const handleReferenceImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // ���� Ÿ�� ����
        if (!file.type.startsWith('image/')) {
            setError('�̹��� ���ϸ� ���ε��� �� �ֽ��ϴ�.');
            return;
        }

        // ���� ũ�� ���� (�ִ� 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('�̹��� ���� ũ���� 10MB�� �ʰ��� �� �����ϴ�.');
            return;
        }

        // ������ �̹��� ���� ����
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('�����Ǵ� �̹��� ����: JPG, JPEG, PNG, WEBP');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1]; // data:image/jpeg;base64, �κ� ����
            setReferenceImage(base64Data);
            setError(null); // ���� �� ���� �ʱ�ȭ
        };
        reader.onerror = () => {
            setError('�̹��� ������ �д� �� ������ �߻��߽��ϴ�.');
        };
        reader.readAsDataURL(file);
    }, []);

    // ���� �̹��� ���� �ڵ鷯
    const handleRemoveReferenceImage = useCallback(() => {
        setReferenceImage(null);
    }, []);

    // ������ ������ �˻� �� �ڵ� ��ü �Լ�
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

    // ������ �ܾ��� �ڵ� ��ü ��ư �ڵ鷯
    const handleAutoReplace = useCallback(() => {
        if (contentWarning) {
            const { replacedText: replacedPersona } = replaceUnsafeWords(personaInput);
            const { replacedText: replacedScript } = replaceUnsafeWords(videoSourceScript);
            setPersonaInput(replacedPersona);
            setVideoSourceScript(replacedScript);
            setContentWarning(null);
            setHasContentWarning(false);
            setIsContentWarningAcknowledged(true);
        }
    }, [personaInput, videoSourceScript, contentWarning]);

    // ������ ���� Ȯ�� �ڵ鷯
    const handleAcknowledgeWarning = useCallback(() => {
        setIsContentWarningAcknowledged(true);
    }, []);

    const handleGeneratePersonas = useCallback(async () => {
        if (!apiKey.trim()) {
            setPersonaError('Google Gemini API Ű�� �Է����ּ���.');
            return;
        }
        if (!personaInput.trim()) {
            setPersonaError('ĳ���� ���� �Ǵ� �뺻�� �Է����ּ���.');
            return;
        }
        
        // ������ ������ �˻� �� �ڵ� ��ü
        const safeInput = checkAndReplaceContent(personaInput);
        
        setIsLoadingCharacters(true);
        setPersonaError(null);
        setCharacters([]);

        try {
            // Step 1: API Ű �׽�Ʈ
            const testResult = await testApiKey(apiKey);
            
            if (!testResult.success) {
                setPersonaError(`API Ű �׽�Ʈ ����: ${testResult.message}`);
                setIsLoadingCharacters(false);
                return;
            }
            
            // Step 2: ĳ���� ����
            const generatedCharacters = await geminiService.generateCharacters(
                safeInput, 
                apiKey, 
                imageStyle, 
                aspectRatio,
                personaStyle,
                customStyle,
                photoComposition,
                customPrompt,
                characterStyle,
                backgroundStyle,
                customCharacterStyle,
                customBackgroundStyle
            );
            if (generatedCharacters.length === 0) {
                setPersonaError('ĳ���� ������ �����߽��ϴ�. �ٸ� ĳ���� �������� �ٽ� �õ��غ�����.');
            } else {
                setCharacters(generatedCharacters);
                if (generatedCharacters.length < 3) { // �Ϻθ� ������ ����
                    setPersonaError(`�Ϻ� ĳ���͸� �����Ǿ����ϴ� (${generatedCharacters.length}��). �Ϻ� ĳ���ʹ� ������ ��å���� ���� �������� �ʾ��� �� �ֽ��ϴ�.`);
                }
            }
        } catch (e) {
            console.error('ĳ���� ���� ����:', e);
            let errorMessage = 'ĳ���� ���� �� ������ �߻��߽��ϴ�.';
            
            if (e instanceof Error) {
                const message = e.message.toLowerCase();
                if (message.includes('content policy') || message.includes('policy restrictions')) {
                    errorMessage = '������ ��å �������� �̹��� ������ �����߽��ϴ�. ĳ���� ������ �� �Ϲ����̰� �������� �������� �����غ�����.';
                } else if (message.includes('api') && message.includes('key')) {
                    errorMessage = 'API Ű �����Դϴ�. �ùٸ� Google Gemini API Ű�� �Է��ߴ��� Ȯ�����ּ���.';
                } else if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
                    errorMessage = 'API ���뷮�� �Ѱ迡 �����߽��ϴ�. ���� �� �ٽ� �õ����ּ���.';
                } else if (message.includes('network') || message.includes('fetch')) {
                    errorMessage = '��Ʈ��ũ ������ �߻��߽��ϴ�. ���ͳ� ������ Ȯ�����ּ���.';
                } else {
                    errorMessage = `����: ${e.message}`;
                }
            } else if (typeof e === 'string') {
                errorMessage = e;
            }
            
            setPersonaError(errorMessage);
        } finally {
            setIsLoadingCharacters(false);
        }
    }, [personaInput, apiKey, imageStyle, aspectRatio, personaStyle, customStyle, photoComposition, customPrompt]);

    const handleRegenerateCharacter = useCallback(async (characterId: string, description: string, name: string, customPrompt?: string) => {
        if (!apiKey.trim()) {
            setPersonaError('Google Gemini API Ű�� �Է����ּ���.');
            return;
        }
        try {
            // Ŀ���� ������Ʈ�� ������ description�� �߰�
            const enhancedDescription = customPrompt 
                ? `${description}. Additional style: ${customPrompt}` 
                : description;
            
            const newImage = await geminiService.regenerateCharacterImage(enhancedDescription, name, apiKey, imageStyle, aspectRatio, personaStyle);
            setCharacters(prev =>
                prev.map(char =>
                    char.id === characterId ? { ...char, image: newImage } : char
                )
            );
        } catch (e) {
            console.error('ĳ���� ������ ����:', e);
            const errorMessage = e instanceof Error 
                ? `캐릭터 이미지 재생성 실패: ${e.message}` 
                : '캐릭터 이미지 재생성에 실패했습니다.';
            setPersonaError(errorMessage);
        }
    }, [apiKey, imageStyle, aspectRatio, personaStyle]);

    const handleGenerateVideoSource = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API Ű�� �Է����ּ���.');
            return;
        }
        if (!videoSourceScript.trim()) {
            setError('���� �ҽ� ������ ���� �뺻�� �Է����ּ���.');
            return;
        }
        if (characters.length === 0) {
            setError('���� ĳ���͸� ������ �� ���� �ҽ��� �������ּ���.');
            return;
        }

        // �̹��� ���� ���� - �ڵ� ���� (�Լ� �ߴ����� ����)
        const limitedImageCount = Math.min(imageCount, 20);
        if (imageCount > 20) {
            setImageCount(20);
            // ������ ǥ�������� ������ ���� ����
            console.warn('�̹��� ������ 20���� �ڵ� �����Ǿ����ϴ�.');
        }

        setIsLoadingVideoSource(true);
        setError(null);
        setVideoSource([]);

        try {
            const generatedVideoSource = await geminiService.generateStoryboard(videoSourceScript, characters, limitedImageCount, apiKey, imageStyle, subtitleEnabled, referenceImage, aspectRatio);
            
            // ������ �̹����� ���͸�
            const successfulImages = generatedVideoSource.filter(item => item.image && item.image.trim() !== '');
            const failedCount = generatedVideoSource.length - successfulImages.length;
            
            setVideoSource(successfulImages);
            
            if (failedCount > 0) {
                setError(`${successfulImages.length}���� �̹����� �����Ǿ����ϴ�. ${failedCount}���� ������ �����߽��ϴ�. �뺻�� �����ϰų� �ٽ� �õ��غ�����.`);
            } else if (successfulImages.length === 0) {
                setError('���� �̹��� ������ �����߽��ϴ�. API Ű�� Ȯ���ϰų� �뺻�� ������ �� �ٽ� �õ��غ�����.');
            }
        } catch (e) {
            console.error('���� �ҽ� ���� ����:', e);
            let errorMessage = '���� �ҽ� ���� �� �� �� ���� ������ �߻��߽��ϴ�.';
            
            if (e instanceof Error) {
                const message = e.message.toLowerCase();
                if (message.includes('api')) {
                    errorMessage = 'API ȣ�⿡ �����߽��ϴ�. API Ű�� Ȯ���ϰų� ���� �� �ٽ� �õ��غ�����.';
                } else if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
                    errorMessage = 'API ���뷮 �ѵ��� �����߽��ϴ�. ���� �� �ٽ� �õ��ϰų� �̹��� ������ �ٿ�������.';
                } else if (message.includes('network') || message.includes('fetch')) {
                    errorMessage = '��Ʈ��ũ ������ �߻��߽��ϴ�. ���ͳ� ������ Ȯ�����ּ���.';
                } else {
                    errorMessage = `����: ${e.message}`;
                }
            } else if (typeof e === 'string') {
                errorMessage = e;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoadingVideoSource(false);
        }
    }, [videoSourceScript, characters, imageCount, apiKey, imageStyle, subtitleEnabled, referenceImage, aspectRatio]);

    const handleRegenerateVideoSourceImage = useCallback(async (videoSourceItemId: string, customPrompt?: string) => {
        if (!apiKey.trim()) {
            setError('Google Gemini API Ű�� �Է����ּ���.');
            return;
        }
        const itemToRegenerate = videoSource.find(item => item.id === videoSourceItemId);
        if (!itemToRegenerate) return;

        try {
            // Ŀ���� ������Ʈ�� ������ ���� ������ �߰�
            const enhancedDescription = customPrompt 
                ? `${itemToRegenerate.sceneDescription}. Additional style: ${customPrompt}` 
                : itemToRegenerate.sceneDescription;

            const newImage = await geminiService.regenerateStoryboardImage(
                enhancedDescription,
                characters,
                apiKey,
                imageStyle,
                subtitleEnabled,
                referenceImage,
                aspectRatio
            );
            setVideoSource(prev =>
                prev.map(item =>
                    item.id === videoSourceItemId ? { ...item, image: newImage } : item
                )
            );
        } catch (e) {
            console.error('���� �ҽ� ������ ����:', e);
            const errorMessage = e instanceof Error 
                ? `영상 소스 이미지 재생성 실패: ${e.message}` 
                : '영상 소스 이미지 재생성에 실패했습니다.';
            setError(errorMessage);
        }
    }, [videoSource, characters, apiKey, imageStyle, subtitleEnabled, referenceImage, aspectRatio]);

    // ������Ʈ�ʽ� ��ũ ���� ���� �Լ�
    const openRandomCoupangLink = () => {
        const coupangLinks = [
            'https://link.coupang.com/a/cT5vZN',
            'https://link.coupang.com/a/cT5v5P',
            'https://link.coupang.com/a/cT5v8V',
            'https://link.coupang.com/a/cT5wcC',
            'https://link.coupang.com/a/cT5wgX'
        ];
        
        const randomLink = coupangLinks[Math.floor(Math.random() * coupangLinks.length)];
        window.open(randomLink, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadAllImages = useCallback(async () => {
        if (videoSource.length === 0) return;

        // �ٿ��ε� ���� ���� ���� ��ũ ����
        openRandomCoupangLink();

        setIsDownloading(true);
        setError(null);
        try {
            const zip = new JSZip();
            videoSource.forEach((item, index) => {
                const safeDescription = item.sceneDescription.replace(/[^a-zA-Z0-9��-����-�Ӱ�-�R]/g, '_').substring(0, 30);
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
            console.error("Failed to create zip file:", e);
            const errorMessage = e instanceof Error 
                ? `ZIP 파일 생성 실패: ${e.message}` 
                : 'ZIP 파일 다운로드에 실패했습니다.';
            setError(errorMessage);
        } finally {
            setIsDownloading(false);
        }
    }, [videoSource]);

    // ������ ó��
    if (currentView === 'api-guide') {
        return (
            <>
                <MetaTags 
                    title="API �߱� ���̵� - ��Ʃ�� ���� �̹��� ������"
                    description="Google Gemini API Ű �߱� ������ �ܰ躰�� �ȳ��մϴ�. ������ ��Ʃ�� �������� AI �̹����� �����ϼ���."
                    url="https://youtube-image.money-hotissue.com/api_�߱�_���̵�"
                    image="/api-guide-preview.png"
                    type="article"
                />
                <ApiKeyGuide onBack={() => {
                    setCurrentView('main');
                    window.history.pushState({}, '', '/');
                }} />
            </>
        );
    }

    if (currentView === 'user-guide') {
        return (
            <>
                <MetaTags 
                    title="��Ʃ�� �̹��� ������ ������ ���̵� - AI�� ������ �����ϱ�"
                    description="AI�� Ȱ���Ͽ� ��Ʃ�� �丣�ҳ��� ���� �ҽ��� �����ϴ� ������ ������ �˷��帳�ϴ�. �ܰ躰 ���̵��� ���� �����ϼ���."
                    url="https://youtube-image.money-hotissue.com/��Ʃ��_�̹���_������_������_���̵�"
                    image="/user-guide-preview.png"
                    type="article"
                />
                <UserGuide 
                    onBack={() => {
                        setCurrentView('main'); 
                        window.history.pushState({}, '', '/');
                    }}
                    onNavigate={(view) => {
                        if (view === 'api-guide') {
                            setCurrentView('api-guide');
                            window.history.pushState({}, '', '/api-guide');
                        }
                    }}
                />
            </>
        );
    }

    return (
        <>
            <MetaTags 
                title="��Ʃ�� ���� �̹��� ������ - AI�� ĳ���Ϳ� ���丮���� ������"
                description="Google Gemini AI�� Ȱ���� ��Ʃ�� �������� �丣�ҳ��� ���� �ҽ��� ���� ������ �����ϼ���. �پ��� ����(9:16, 16:9, 1:1) ����."
                url="https://youtube-image.money-hotissue.com"
                image="/og-image.png"
                type="website"
            />
            <div className="min-h-screen bg-[#121212] text-white font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1"></div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-[#FF0000] to-[#FF2B2B] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,0,0,0.6)] whitespace-nowrap">
                            ��Ʃ�� ���� �̹��� ������
                        </h1>
                        <div className="flex-1 flex justify-end">
                            <button
                                onClick={() => {
                                    setCurrentView('api-guide');
                                    window.history.pushState({}, '', '/api-guide');
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="Settings"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p className="text-gray-400 mb-6">��ũ��Ʈ�� �Է��ϰ� �ϰ��� ĳ���Ϳ� ���� �ҽ� �̹����� �����ϼ���!</p>
                    <nav className="flex justify-center gap-4">
                        <button 
                            onClick={() => {
                                setCurrentView('user-guide');
                                window.history.pushState({}, '', '/user-guide');
                            }}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700 text-sm font-medium"
                        >
                            📖 사용법
                        </button>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700 text-sm font-medium"
                        >
                            🗝️ API 발급
                        </a>
                    </nav>
                </header>
                
                <main className="space-y-6">
                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">1️⃣</span>
                            API 키 입력
                        </h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => handleApiKeyChange(e.target.value)}
                                    placeholder="Google Gemini API Ű�� �Է��ϼ���..."
                                    className="flex-1 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
                                />
                                <button 
                                    onClick={() => {
                                        setCurrentView('api-guide');
                                        window.history.pushState({}, '', '/api-guide');
                                    }}
                                    className="px-4 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                                >
                                    📚 발급 방법
                                </button>
                            </div>
                            
                            {/* API 키 저장 옵션 */}
                            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={rememberApiKey}
                                            onChange={(e) => handleRememberMeChange(e.target.checked)}
                                            className="mr-2 w-4 h-4 text-green-600 bg-[#121212] border-gray-600 rounded focus:ring-red-500"
                                        />
                                        <span className="text-sm">
                                            <strong className="text-green-400">✅ API 키 기억하기</strong>
                                            <span className="text-gray-400 text-xs ml-1 block">
                                                {rememberApiKey ? '브라우저에 암호화 저장됨' : '탭 닫으면 삭제됨'}
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
                            </div>
                            
                            {/* 보안 안내 */}
                            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <span className="text-amber-500 text-lg flex-shrink-0">🔒</span>
                                    <div className="text-sm space-y-1">
                                        <p className="text-amber-400 font-semibold">보안 안내</p>
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            • API 키는 {rememberApiKey ? '암호화되어 브라우저에만' : '현재 세션에만'} 저장되며, 외부 서버로 전송되지 않습니다<br/>
                                            • 공용 컴퓨터를 사용하는 경우 "기억하기"를 체크하지 마세요<br/>
                                            • API 키가 유출된 경우 즉시 Google AI Studio에서 재발급 받으세요
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* API 비용 안내 */}
                            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-500 text-lg flex-shrink-0">💰</span>
                                    <div className="text-sm space-y-1">
                                        <p className="text-blue-400 font-semibold">API 비용 안내</p>
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            • Gemini API 무료 등급에서 이미지 생성 기능 제공<br/>
                                            • <span className="text-blue-400 font-semibold">분당 15회 요청</span> 제한만 있고, 결제나 비용 발생 없음<br/>
                                            • 분당 요청 수만 지키면 <span className="text-blue-400 font-semibold">무료</span>로 사용 가능
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 광고 1: API 키와 페르소나 생성 사이 */}
                    <AdBanner />

                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">2️⃣</span>
                            페르소나 생성
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                구체적인 인물 묘사를 입력하거나, 대본을 넣으면 등장인물들을 자동으로 분석하여 생성합니다.
                            </p>
                            <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4 mb-4">
                                <p className="text-purple-200 text-sm mb-2"><strong>�Է� ����:</strong></p>
                                <ul className="text-purple-300 text-sm space-y-1 ml-4">
                                    <li>? <strong>�ι� ����:</strong> "20�� �߹� ����, �� ����, ���� �̼�, ĳ�־��� ������"</li>
                                    <li>? <strong>�뺻 �Է�:</strong> ��ü ���丮 �뺻�� ������ �����ι� �ڵ� ����</li>
                                </ul>
                            </div>
                        </div>
                        <textarea
                            value={personaInput}
                            onChange={(e) => setPersonaInput(e.target.value)}
                            placeholder="�ι� ���糪 �뺻�� �Է��ϼ���..."
                            className="w-full h-48 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 resize-y mb-6"
                        />

                        {/* �̹��� ��Ÿ�� ���� */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-6 flex items-center">
                                <span className="mr-2">??</span>
                                �̹��� ��Ÿ�� ����
                            </h3>
                            
                            {/* �ι� ��Ÿ�� */}
                            <div className="mb-6">
                                <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                                    <span className="mr-2">??</span>
                                    �ι� ��Ÿ��
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(['�ǻ� �ش�ȭ', '�ִϸ��̼�', '����', '1980����', '2000����'] as CharacterStyle[]).map((style) => {
                                        const styleDescriptions: Record<CharacterStyle, string> = {
                                            '�ǻ� �ش�ȭ': '?? ���������̰� ���� ���� ����Ƽ�� �ǻ� �ι�',
                                            '�ִϸ��̼�': '?? ���� ȭ���� �ִϸ��̼� ��Ÿ�� ĳ����',
                                            '����': '?? �Ϳ��� ���� ĳ���ͷ� ��ȯ',
                                            '1980����': '?? 80���� �мǰ� ���Ÿ��',
                                            '2000����': '?? 2000���� �ʹ� �мǰ� ��Ÿ��',
                                            'custom': ''
                                        };

                                        return (
                                            <div key={style} className="relative group">
                                                <button
                                                    onClick={() => setCharacterStyle(style)}
                                                    onMouseEnter={() => setHoveredStyle(`character-${style}`)}
                                                    onMouseLeave={() => setHoveredStyle(null)}
                                                    className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                        characterStyle === style
                                                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
                                                    }`}
                                                >
                                                    {style}
                                                </button>
                                                {hoveredStyle === `character-${style}` && (
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                                                        <div className="bg-[#121212] rounded-lg shadow-2xl border border-purple-500/50 overflow-hidden">
                                                            <div className="p-2">
                                                                <div className="text-purple-200 font-medium text-xs mb-2 text-center">{style} �̸�����</div>
                                                                <img 
                                                                    src={`/${style}.png`}
                                                                    alt={`${style} ��Ÿ�� �̸�����`}
                                                                    className="w-48 h-32 object-cover rounded"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                        const parent = target.parentElement;
                                                                        if (parent) {
                                                                            const fallback = document.createElement('div');
                                                                            fallback.className = 'w-48 h-32 bg-gray-800 rounded flex items-center justify-center text-purple-300 text-sm text-center p-2';
                                                                            fallback.textContent = styleDescriptions[style];
                                                                            parent.appendChild(fallback);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="text-gray-300 text-xs mt-2 text-center px-2">
                                                                    {styleDescriptions[style]}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCharacterStyle('custom')}
                                        className={`py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                            characterStyle === 'custom'
                                                ? 'bg-purple-600 text-white shadow-lg scale-105'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        ���� �Է�
                                    </button>
                                </div>
                                {characterStyle === 'custom' && (
                                    <input
                                        type="text"
                                        value={customCharacterStyle}
                                        onChange={(e) => setCustomCharacterStyle(e.target.value)}
                                        placeholder="���ϴ� �ι� ��Ÿ���� �Է��ϼ��� (��: ���׻���, ���丮�� �ô� ��)"
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3"
                                    />
                                )}
                            </div>

                            {/* ����/������ ��Ÿ�� */}
                            <div>
                                <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                                    <span className="mr-2">??</span>
                                    ����/������ ��Ÿ��
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                                    {(['���� ����', '���α�', '���� ������', '���̹���ũ', '��Ÿ��', '�̴ϸ�', '��Ƽ��', '����', '�Թ�', '�Ϳ���', 'AI', '������', 'â������'] as BackgroundStyle[]).map((style) => {
                                        const styleDescriptions: Record<BackgroundStyle, string> = {
                                            '���� ����': '?? �θ�ƽ�ϰ� �������� ������ ������',
                                            '���α�': '?? ��ģ �縷�� ī�캸�� ����',
                                            '���� ������': '?? �̽��͸��ϰ� ���尨 �ִ� ������',
                                            '���̹���ũ': '?? �׿»��� ������ �̷� ����',
                                            '��Ÿ��': '???��? �������̰� �ź��ο� �߼� ����',
                                            '�̴ϸ�': '? �����ϰ� �ܼ��� �߼��� ����',
                                            '��Ƽ��': '?? Ŭ�����ϰ� ������ �ھƳ��� ����',
                                            '����': '?? �������̰� ���õ� ���� ����',
                                            '�Թ�': '??? ���ִ� ������ ������ �Թ� ������',
                                            '�Ϳ���': '?? �Ϳ��� ���������� �Ľ��� ����',
                                            'AI': '?? �̷��������� ������ũ AI ������',
                                            '������': '??? ��Ư�ϰ� ���������� �⹦�� ������',
                                            'â������': '?? ������ ��ġ�� ��â���� ���� ������',
                                            'custom': ''
                                        };

                                        return (
                                            <div key={style} className="relative group">
                                                <button
                                                    onClick={() => setBackgroundStyle(style)}
                                                    onMouseEnter={() => setHoveredStyle(`background-${style}`)}
                                                    onMouseLeave={() => setHoveredStyle(null)}
                                                    className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                        backgroundStyle === style
                                                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
                                                    }`}
                                                >
                                                    {style}
                                                </button>
                                                {hoveredStyle === `background-${style}` && (
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                                                        <div className="bg-[#121212] rounded-lg shadow-2xl border border-purple-500/50 overflow-hidden">
                                                            <div className="p-2">
                                                                <div className="text-purple-200 font-medium text-xs mb-2 text-center">{style} �̸�����</div>
                                                                <img 
                                                                    src={`/${style === 'AI' ? 'ai' : style}.png`}
                                                                    alt={`${style} ��Ÿ�� �̸�����`}
                                                                    className="w-48 h-32 object-cover rounded"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                        const parent = target.parentElement;
                                                                        if (parent) {
                                                                            const fallback = document.createElement('div');
                                                                            fallback.className = 'w-48 h-32 bg-gray-800 rounded flex items-center justify-center text-purple-300 text-sm text-center p-2';
                                                                            fallback.textContent = styleDescriptions[style];
                                                                            parent.appendChild(fallback);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="text-gray-300 text-xs mt-2 text-center px-2">
                                                                    {styleDescriptions[style]}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => setBackgroundStyle('custom')}
                                        className={`py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                            backgroundStyle === 'custom'
                                                ? 'bg-purple-600 text-white shadow-lg scale-105'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        ���� �Է�
                                    </button>
                                </div>
                                {backgroundStyle === 'custom' && (
                                    <input
                                        type="text"
                                        value={customBackgroundStyle}
                                        onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                                        placeholder="���ϴ� ����/�����⸦ �Է��ϼ��� (��: ���� ������, ���� �غ� ��)"
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3"
                                    />
                                )}
                            </div>
                        </div>

                        {/* ���� ���� (���� �� ����) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-4 flex items-center">
                                <span className="mr-2">??</span>
                                ���� ����
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* ����: ���� ���� ���� */}
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        ���� ����
                                    </label>
                                    <select
                                        value={photoComposition}
                                        onChange={(e) => setPhotoComposition(e.target.value as PhotoComposition)}
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-white"
                                    >
                                        <option value="����">���� (�⺻)</option>
                                        <option value="����">����</option>
                                        <option value="������">������</option>
                                        <option value="������">������</option>
                                        <option value="�Ʒ�����">�Ʒ�����</option>
                                        <option value="����">����</option>
                                        <option value="���ݽ�">���ݽ�</option>
                                        <option value="Ŭ������">Ŭ������</option>
                                    </select>
                                </div>

                                {/* ������: �̹��� ���� ���� */}
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        �̹��� ����
                                    </label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-white"
                                    >
                                        <option value="9:16">?? 9:16 - ������ ����</option>
                                        <option value="16:9">??? 16:9 - ����ũ�� ����</option>
                                        <option value="1:1">? 1:1 - ���簢��</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-3">
                                ?? ���� ������ �̹��� ������ �����Ͽ� ���ϴ� ��Ÿ���� �̹����� ���弼��.
                            </div>
                        </div>

                        {/* Ŀ���� ������Ʈ (���û���) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-purple-300 font-medium flex items-center">
                                    <span className="mr-2">?</span>
                                    Ŀ���� �̹��� ������Ʈ (���û���)
                                </h3>
                                <button
                                    onClick={() => {
                                        setCurrentView('image-prompt');
                                        window.history.pushState({}, '', '/image-prompt');
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex items-center"
                                >
                                    <span className="mr-2">??</span>
                                    ���� ���ϴ� �̹��� 200% �̴� ���Ͽ�
                                </button>
                            </div>
                            
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="���� �����ڿ�: AI���� ������ ��ü���� �̹��� ������Ʈ�� ���� �Է��ϼ��� (���� ����)"
                                className="w-full h-24 p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-y"
                            />
                            <p className="text-gray-400 text-xs mt-2">
                                ?? �� �ʵ��� ���� �����ڸ� ���� �����Դϴ�. �����θ� �ڵ����� ����ȭ�� ������Ʈ�� �����˴ϴ�.
                            </p>
                        </div>

                        {/* �ϰ��� ���� (���û���) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">??</span>
                                �ϰ��� ���� (���û���)
                            </h3>
                            <p className="text-purple-200 text-sm mb-3">
                                ���� �̹����� ���ε��ϸ� �ش� �̹����� ��Ÿ�ϰ� �ϰ����� �����ϸ� �丣�ҳ��� �����մϴ�.
                            </p>
                            
                            {!referenceImage ? (
                                <div className="border-2 border-dashed border-purple-400 rounded-lg p-6 text-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReferenceImageUpload}
                                        className="hidden"
                                        id="referenceImageInput"
                                    />
                                    <label 
                                        htmlFor="referenceImageInput"
                                        className="cursor-pointer flex flex-col items-center space-y-2 hover:text-purple-300 transition-colors"
                                    >
                                        <div className="text-3xl">??</div>
                                        <div className="text-purple-300 font-medium">���� �̹��� ���ε�</div>
                                        <div className="text-purple-400 text-sm">Ŭ���Ͽ� �̹����� �����ϼ���</div>
                                    </label>
                                </div>
                            ) : (
                                <div className="relative bg-[#121212] rounded-lg p-4">
                                    <div className="flex items-center space-x-4">
                                        <img 
                                            src={`data:image/jpeg;base64,${referenceImage}`}
                                            alt="���� �̹���"
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <div className="text-purple-300 font-medium">���� �̹��� ���ε���</div>
                                            <div className="text-purple-400 text-sm">�� �̹����� ��Ÿ���� �����Ͽ� �丣�ҳ��� �����մϴ�</div>
                                        </div>
                                        <button
                                            onClick={handleRemoveReferenceImage}
                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                        >
                                            ����
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* ������ ��å ���� ���� */}
                        {contentWarning && !isContentWarningAcknowledged && (
                            <div className="mt-4 bg-orange-900/50 border border-orange-500 text-orange-300 p-4 rounded-lg">
                                <div className="flex items-start">
                                    <span className="text-orange-400 text-xl mr-3">??</span>
                                    <div className="flex-1">
                                        <p className="font-medium mb-2">������ ��å ���� ���ɼ��� �ִ� �ܾ �����Ǿ����ϴ�</p>
                                        <div className="mb-3">
                                            <p className="text-sm text-orange-200 mb-2">������ �ܾ�:</p>
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
                                                ?? ������ �ܾ��� �ڵ� ��ü
                                            </button>
                                            <button
                                                onClick={handleAcknowledgeWarning}
                                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Ȯ���ϰ� ����
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={handleGeneratePersonas}
                            disabled={isLoadingCharacters || !personaInput.trim() || !apiKey.trim() || (hasContentWarning && !isContentWarningAcknowledged)}
                            className="mt-4 w-full sm:w-auto px-6 py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                        >
                            {isLoadingCharacters ? <><Spinner size="sm" /> <span className="ml-2">�丣�ҳ� ���� ��...</span></> : '�丣�ҳ� ����'}
                        </button>
                    </section>

                    {/* �丣�ҳ� ���� ���� ���� ǥ�� */}
                    {personaError && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-red-400 text-xl mr-3">??</span>
                                <div className="flex-1">
                                    <p className="font-medium mb-2">{personaError}</p>
                                    {personaError.includes('content policy') || personaError.includes('policy restrictions') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>�ذ� ����:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? ĳ���� �̸��� �� �Ϲ������� ���� (��: "�̽��͸��� ����" �� "�ź��ο� �ι�")</li>
                                                <li>? �������̰ų� �������� ǥ�� ����</li>
                                                <li>? �������̰� ������ ĳ���ͷ� ����</li>
                                            </ul>
                                        </div>
                                    ) : personaError.includes('API Ű') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>API Ű ���� �ذ�:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? API Ű�� ��Ȯ�� �ԷµǾ����� Ȯ��</li>
                                                <li>? Google AI Studio���� �� API Ű �߱�</li>
                                                <li>? API Ű�� Gemini ���� ������ �ִ��� Ȯ��</li>
                                            </ul>
                                        </div>
                                    ) : null}
                                    <button 
                                        onClick={() => setPersonaError(null)}
                                        className="mt-3 text-red-400 hover:text-red-300 text-sm underline"
                                    >
                                        ���� �޽��� �ݱ�
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoadingCharacters && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">�����ι��� �м��ϰ� �̹����� �����ϰ� �ֽ��ϴ�... ���ø� ���ٷ� �ּ���.</p>
                        </div>
                    )}

                    {characters.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-purple-300">������ �丣�ҳ�</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {characters.map(char => (
                                    <CharacterCard key={char.id} character={char} onRegenerate={handleRegenerateCharacter} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ���� 2: �丣�ҳ� ������ ���� �ҽ� ���� ���� */}
                    <AdBanner />

                    {/* 3�ܰ��� �׻� ǥ�� */}
                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">3️⃣</span>
                            영상 소스 생성
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                위에서 생성한 페르소나를 활용하여 영상 소스를 만듭니다. 대본 또는 시퀀스별 장면을 입력해주세요.
                            </p>
                            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                                <p className="text-green-200 text-sm mb-2"><strong>�Է� ����:</strong></p>
                                <ul className="text-green-300 text-sm space-y-1 ml-4">
                                    <li>? <strong>��ü �뺻:</strong> ������ ��ũ��Ʈ�� ���丮�� �Է�</li>
                                    <li>? <strong>�������� ����:</strong> �� �ٿ� �ϳ��� ���� ������ �Է�</li>
                                </ul>
                            </div>
                        </div>
                        <textarea
                            value={videoSourceScript}
                            onChange={(e) => setVideoSourceScript(e.target.value)}
                            placeholder="�뺻 ��ü�� ��������. �Ǵ� �������� ���ϴ� ������ ��������.

����:
1. �̷� ���� ���󿡼� �κ��� ������ �ٶ󺸸� �� �ִ� ����
2. ������������ Ȧ�α׷� �������� ���ߴ� ����  
3. �׿»����� �ݻ��� ���� �Ÿ��� �ɾ�� ���̺���
4. ���� ������ â�� �ʸӷ� ������ �����ٺ��� ����"
                            className="w-full h-48 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 resize-y mb-4"
                        />
                        
                        {/* ���� �ɼ� ���� */}
                        <div className="mb-4 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                            <h3 className="text-green-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">??</span>
                                ���� �ɼ� ����
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* �ڸ� ���� */}
                                <div>
                                    <label className="block text-sm font-medium text-green-200 mb-2">
                                        ?? �ڸ� ����
                                    </label>
                                    <select
                                        value={subtitleEnabled ? 'on' : 'off'}
                                        onChange={(e) => setSubtitleEnabled(e.target.value === 'on')}
                                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-green-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="off">?? �ڸ� OFF (�⺻��)</option>
                                        <option value="on">?? �ڸ� ON</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        �ڸ� ���� ���θ� �����ϼ���
                                    </p>
                                </div>

                                {/* �̹��� �� ���� */}
                                <div>
                                    <Slider 
                                        label="������ �̹��� ��"
                                        min={5}
                                        max={20}
                                        value={Math.min(imageCount, 20)}
                                        onChange={(e) => setImageCount(parseInt(e.target.value))}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        �������� ������ ���� �ִ� 20���� ����
                                    </p>
                                </div>
                            </div>
                        </div>



                        <div className="mt-4">
                            <button
                                onClick={handleGenerateVideoSource}
                                disabled={isLoadingVideoSource || !videoSourceScript.trim() || !apiKey.trim() || (hasContentWarning && !isContentWarningAcknowledged)}
                                className="w-full sm:w-auto px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                            >
                                {isLoadingVideoSource ? <><Spinner size="sm" /> <span className="ml-2">���� �ҽ� ���� ��...</span></> : '���� �ҽ� ����'}
                            </button>
                        </div>
                    </section>

                    {/* ���� �ҽ� ���� ���� ���� ǥ�� */}
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-red-400 text-xl mr-3">??</span>
                                <div className="flex-1">
                                    <p className="font-medium mb-2">{error}</p>
                                    {error.includes('content policy') || error.includes('policy restrictions') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>�ذ� ����:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? �뺻 ������ �� �Ϲ����̰� ���������� ����</li>
                                                <li>? �������̰ų� �������� ���� ����</li>
                                                <li>? �� �����ϰ� �������� �������� ����</li>
                                                <li>? ��ü���� ���� ������ ����</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('API Ű') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>API Ű ���� �ذ�:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? API Ű�� ��Ȯ�� �ԷµǾ����� Ȯ��</li>
                                                <li>? Google AI Studio���� �� API Ű �߱�</li>
                                                <li>? API Ű�� Gemini ���� ������ �ִ��� Ȯ��</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('quota') || error.includes('limit') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>�ذ� ����:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? 5-10�� �� �ٽ� �õ�</li>
                                                <li>? �� ���� ������ �̹��� ���� �ٿ�������</li>
                                                <li>? Google Cloud Console���� �Ҵ緮 Ȯ��</li>
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}

                     {isLoadingVideoSource && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">������ ������ �ֽ��ϴ�... �� �۾��� �ð��� �ɸ� �� �ֽ��ϴ�.</p>
                        </div>
                    )}
                    
                    {videoSource.length > 0 && (
                        <section>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-2xl font-bold text-indigo-300">������ ���� �ҽ�</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGenerateVideoSource}
                                        disabled={isLoadingVideoSource || !videoSourceScript.trim() || !apiKey.trim() || (hasContentWarning && !isContentWarningAcknowledged)}
                                        className="px-4 py-2 bg-blue-600 font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                    >
                                        {isLoadingVideoSource ? <><Spinner size="sm" /><span className="ml-2">���� ��...</span></> : '�� �� �� ����'}
                                    </button>
                                    <button
                                        onClick={handleDownloadAllImages}
                                        disabled={isDownloading}
                                        className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                    >
                                        {isDownloading ? <><Spinner size="sm" /><span className="ml-2">���� ��...</span></> : '���� �̹��� ����'}
                                    </button>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videoSource.map((item) => (
                                    <StoryboardImage key={item.id} item={item} onRegenerate={handleRegenerateVideoSourceImage} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="my-8">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg shadow-lg text-center">
                            <h3 className="text-xl font-bold mb-2">?? �� ���� ���� ���� ������ �ʿ��ϽŰ���?</h3>
                            <p className="mb-4">�������ų��� ���� ������ ȿ���� ���� �������� Ȯ���غ�����!</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="https://youtube-analyze.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? ������ �뺻 1�� ī��
                                </a>
                                <a href="https://aimusic-l.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? AI ���� ���� 1�� �ϼ�
                                </a>
                                <a href="https://aimusic-i.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? AI ���� ������ ����
                                </a>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
            </div>
        </>
    );
};

export default App;





