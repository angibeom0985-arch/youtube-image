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
    const [imageStyle, setImageStyle] = useState<'realistic' | 'animation'>('realistic'); // ±âÁ¸ ÀÌ¹ÌÁö ½ºÅ¸ÀÏ (½Ç»ç/¾Ö´Ï¸ÞÀÌ¼Ç)
    const [personaStyle, setPersonaStyle] = useState<ImageStyle>('½Ç»ç ±Ø´ëÈ­'); // ±âÁ¸ Æä¸£¼Ò³ª ½ºÅ¸ÀÏ (È£È¯¼º À¯Áö)
    const [characterStyle, setCharacterStyle] = useState<CharacterStyle>('½Ç»ç ±Ø´ëÈ­'); // ÀÎ¹° ½ºÅ¸ÀÏ
    const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('¸ð´ø'); // ¹è°æ/ºÐÀ§±â ½ºÅ¸ÀÏ
    const [customCharacterStyle, setCustomCharacterStyle] = useState<string>(''); // Ä¿½ºÅÒ ÀÎ¹° ½ºÅ¸ÀÏ
    const [customBackgroundStyle, setCustomBackgroundStyle] = useState<string>(''); // Ä¿½ºÅÒ ¹è°æ ½ºÅ¸ÀÏ
    const [customStyle, setCustomStyle] = useState<string>(''); // Ä¿½ºÅÒ ½ºÅ¸ÀÏ ÀÔ·Â (±âÁ¸ È£È¯¼º)
    const [photoComposition, setPhotoComposition] = useState<PhotoComposition>('Á¤¸é'); // »çÁø ±¸µµ
    const [customPrompt, setCustomPrompt] = useState<string>(''); // Ä¿½ºÅÒ ÀÌ¹ÌÁö ÇÁ·ÒÇÁÆ®
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9'); // ÀÌ¹ÌÁö ºñÀ² ¼±ÅÃ
    const [personaInput, setPersonaInput] = useState<string>(''); // Æä¸£¼Ò³ª »ý¼º¿ë ÀÔ·Â
    const [videoSourceScript, setVideoSourceScript] = useState<string>(''); // ¿µ»ó ¼Ò½º¿ë ´ëº»
    const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(false); // ÀÚ¸· Æ÷ÇÔ ¿©ºÎ - ±âº» OFF
    const [referenceImage, setReferenceImage] = useState<string | null>(null); // ÀÏ°ü¼º À¯Áö¸¦ À§ÇÑ ÂüÁ¶ ÀÌ¹ÌÁö
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
    const [hoveredStyle, setHoveredStyle] = useState<string | null>(null); // È£¹öµÈ ½ºÅ¸ÀÏ

    // URL ±â¹Ý ÇöÀç ºä °áÁ¤ ¹× ºê¶ó¿ìÀú ³×ºñ°ÔÀÌ¼Ç Ã³¸®
    useEffect(() => {
        const updateViewFromPath = () => {
            const path = decodeURIComponent(window.location.pathname);
            if (path === '/api-guide' || path.includes('api') && path.includes('°¡ÀÌµå')) {
                setCurrentView('api-guide');
            } else if (path === '/user-guide' || path.includes('»ç¿ë¹ý') && path.includes('°¡ÀÌµå')) {
                setCurrentView('user-guide');
            } else if (path === '/image-prompt') {
                setCurrentView('image-prompt');
            } else {
                setCurrentView('main');
            }
        };

        // ÃÊ±â ·Îµå ½Ã ºä ¼³Á¤
        updateViewFromPath();

        // ºê¶ó¿ìÀú µÚ·Î°¡±â/¾ÕÀ¸·Î°¡±â ¹öÆ° Ã³¸®
        const handlePopState = () => {
            updateViewFromPath();
        };

        window.addEventListener('popstate', handlePopState);

        // cleanup
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // ÄÄÆ÷³ÍÆ® ¸¶¿îÆ® ½Ã ÀúÀåµÈ API Å° ·Îµù
    useEffect(() => {
        const savedApiKey = loadApiKey();
        if (savedApiKey) {
            setApiKey(savedApiKey);
            setRememberApiKey(isRememberMeEnabled());
        }
    }, []);

    // API Å° º¯°æ ½Ã ÀÚµ¿ ÀúÀå
    const handleApiKeyChange = useCallback((newApiKey: string) => {
        setApiKey(newApiKey);
        if (newApiKey.trim()) {
            saveApiKey(newApiKey, rememberApiKey);
        }
    }, [rememberApiKey]);

    // ½Ç½Ã°£ ÄÜÅÙÃ÷ ¾ÈÀü¼º °Ë»ç
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

    // Remember Me ¼³Á¤ º¯°æ
    const handleRememberMeChange = useCallback((remember: boolean) => {
        setRememberApiKey(remember);
        if (apiKey.trim()) {
            saveApiKey(apiKey, remember);
        }
    }, [apiKey]);

    // API Å° »èÁ¦
    const handleClearApiKey = useCallback(() => {
        clearApiKey();
        setApiKey('');
        setRememberApiKey(true);
    }, []);

    // ÂüÁ¶ ÀÌ¹ÌÁö ¾÷·Îµå ÇÚµé·¯
    const handleReferenceImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // ÆÄÀÏ Å¸ÀÔ °ËÁõ
        if (!file.type.startsWith('image/')) {
            setError('ÀÌ¹ÌÁö ÆÄÀÏ¸¸ ¾÷·ÎµåÇÒ ¼ö ÀÖ½À´Ï´Ù.');
            return;
        }

        // ÆÄÀÏ Å©±â °ËÁõ (ÃÖ´ë 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('ÀÌ¹ÌÁö ÆÄÀÏ Å©±â´Â 10MB¸¦ ÃÊ°úÇÒ ¼ö ¾ø½À´Ï´Ù.');
            return;
        }

        // Çã¿ëµÈ ÀÌ¹ÌÁö Æ÷¸Ë °ËÁõ
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Áö¿øµÇ´Â ÀÌ¹ÌÁö Çü½Ä: JPG, JPEG, PNG, WEBP');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1]; // data:image/jpeg;base64, ºÎºÐ Á¦°Å
            setReferenceImage(base64Data);
            setError(null); // ¼º°ø ½Ã ¿¡·¯ ÃÊ±âÈ­
        };
        reader.onerror = () => {
            setError('ÀÌ¹ÌÁö ÆÄÀÏÀ» ÀÐ´Â Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù.');
        };
        reader.readAsDataURL(file);
    }, []);

    // ÂüÁ¶ ÀÌ¹ÌÁö »èÁ¦ ÇÚµé·¯
    const handleRemoveReferenceImage = useCallback(() => {
        setReferenceImage(null);
    }, []);

    // ÄÜÅÙÃ÷ ¾ÈÀü¼º °Ë»ç ¹× ÀÚµ¿ ±³Ã¼ ÇÔ¼ö
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

    // ¾ÈÀüÇÑ ´Ü¾î·Î ÀÚµ¿ ±³Ã¼ ¹öÆ° ÇÚµé·¯
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

    // ÄÜÅÙÃ÷ °æ°í È®ÀÎ ÇÚµé·¯
    const handleAcknowledgeWarning = useCallback(() => {
        setIsContentWarningAcknowledged(true);
    }, []);

    const handleGeneratePersonas = useCallback(async () => {
        if (!apiKey.trim()) {
            setPersonaError('Google Gemini API Å°¸¦ ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        if (!personaInput.trim()) {
            setPersonaError('Ä³¸¯ÅÍ ¼³¸í ¶Ç´Â ´ëº»À» ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        
        // ÄÜÅÙÃ÷ ¾ÈÀü¼º °Ë»ç ¹× ÀÚµ¿ ±³Ã¼
        const safeInput = checkAndReplaceContent(personaInput);
        
        setIsLoadingCharacters(true);
        setPersonaError(null);
        setCharacters([]);

        try {
            // Step 1: API Å° Å×½ºÆ®
            const testResult = await testApiKey(apiKey);
            
            if (!testResult.success) {
                setPersonaError(`API Å° Å×½ºÆ® ½ÇÆÐ: ${testResult.message}`);
                setIsLoadingCharacters(false);
                return;
            }
            
            // Step 2: Ä³¸¯ÅÍ »ý¼º
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
                setPersonaError('Ä³¸¯ÅÍ »ý¼º¿¡ ½ÇÆÐÇß½À´Ï´Ù. ´Ù¸¥ Ä³¸¯ÅÍ ¼³¸íÀ¸·Î ´Ù½Ã ½ÃµµÇØº¸¼¼¿ä.');
            } else {
                setCharacters(generatedCharacters);
                if (generatedCharacters.length < 3) { // ÀÏºÎ¸¸ ¼º°øÇÑ °æ¿ì
                    setPersonaError(`ÀÏºÎ Ä³¸¯ÅÍ¸¸ »ý¼ºµÇ¾ú½À´Ï´Ù (${generatedCharacters.length}°³). ÀÏºÎ Ä³¸¯ÅÍ´Â ÄÜÅÙÃ÷ Á¤Ã¥À¸·Î ÀÎÇØ »ý¼ºµÇÁö ¾Ê¾ÒÀ» ¼ö ÀÖ½À´Ï´Ù.`);
                }
            }
        } catch (e) {
            console.error('Ä³¸¯ÅÍ »ý¼º ¿À·ù:', e);
            let errorMessage = 'Ä³¸¯ÅÍ »ý¼º Áß ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù.';
            
            if (e instanceof Error) {
                const message = e.message.toLowerCase();
                if (message.includes('content policy') || message.includes('policy restrictions')) {
                    errorMessage = 'ÄÜÅÙÃ÷ Á¤Ã¥ À§¹ÝÀ¸·Î ÀÌ¹ÌÁö »ý¼ºÀÌ ½ÇÆÐÇß½À´Ï´Ù. Ä³¸¯ÅÍ ¼³¸íÀ» ´õ ÀÏ¹ÝÀûÀÌ°í ±àÁ¤ÀûÀÎ ³»¿ëÀ¸·Î ¼öÁ¤ÇØº¸¼¼¿ä.';
                } else if (message.includes('api') && message.includes('key')) {
                    errorMessage = 'API Å° ¿À·ùÀÔ´Ï´Ù. ¿Ã¹Ù¸¥ Google Gemini API Å°¸¦ ÀÔ·ÂÇß´ÂÁö È®ÀÎÇØÁÖ¼¼¿ä.';
                } else if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
                    errorMessage = 'API »ç¿ë·®ÀÌ ÇÑ°è¿¡ µµ´ÞÇß½À´Ï´Ù. Àá½Ã ÈÄ ´Ù½Ã ½ÃµµÇØÁÖ¼¼¿ä.';
                } else if (message.includes('network') || message.includes('fetch')) {
                    errorMessage = '³×Æ®¿öÅ© ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù. ÀÎÅÍ³Ý ¿¬°áÀ» È®ÀÎÇØÁÖ¼¼¿ä.';
                } else {
                    errorMessage = `¿À·ù: ${e.message}`;
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
            setPersonaError('Google Gemini API Å°¸¦ ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        try {
            // Ä¿½ºÅÒ ÇÁ·ÒÇÁÆ®°¡ ÀÖÀ¸¸é description¿¡ Ãß°¡
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
            console.error('Ä³¸¯ÅÍ Àç»ý¼º ¿À·ù:', e);
            const errorMessage = e instanceof Error 
                ? `Ä³¸¯ÅÍ ÀÌ¹ÌÁö Àç»ý¼º ½ÇÆÐ: ${e.message}` 
                : 'Ä³¸¯ÅÍ ÀÌ¹ÌÁö Àç»ý¼º¿¡ ½ÇÆÐÇß½À´Ï´Ù.';
            setPersonaError(errorMessage);
        }
    }, [apiKey, imageStyle, aspectRatio, personaStyle]);

    const handleGenerateVideoSource = useCallback(async () => {
        if (!apiKey.trim()) {
            setError('Google Gemini API Å°¸¦ ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        if (!videoSourceScript.trim()) {
            setError('¿µ»ó ¼Ò½º »ý¼ºÀ» À§ÇÑ ´ëº»À» ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        if (characters.length === 0) {
            setError('¸ÕÀú Ä³¸¯ÅÍ¸¦ »ý¼ºÇÑ ÈÄ ¿µ»ó ¼Ò½º¸¦ ¸¸µé¾îÁÖ¼¼¿ä.');
            return;
        }

        // ÀÌ¹ÌÁö °³¼ö Á¦ÇÑ - ÀÚµ¿ Á¶Á¤ (ÇÔ¼ö Áß´ÜÇÏÁö ¾ÊÀ½)
        const limitedImageCount = Math.min(imageCount, 20);
        if (imageCount > 20) {
            setImageCount(20);
            // °æ°í´Â Ç¥½ÃÇÏÁö¸¸ »ý¼ºÀº °è¼Ó ÁøÇà
            console.warn('ÀÌ¹ÌÁö °³¼ö°¡ 20°³·Î ÀÚµ¿ Á¶Á¤µÇ¾ú½À´Ï´Ù.');
        }

        setIsLoadingVideoSource(true);
        setError(null);
        setVideoSource([]);

        try {
            const generatedVideoSource = await geminiService.generateStoryboard(videoSourceScript, characters, limitedImageCount, apiKey, imageStyle, subtitleEnabled, referenceImage, aspectRatio);
            
            // ¼º°øÇÑ ÀÌ¹ÌÁö¸¸ ÇÊÅÍ¸µ
            const successfulImages = generatedVideoSource.filter(item => item.image && item.image.trim() !== '');
            const failedCount = generatedVideoSource.length - successfulImages.length;
            
            setVideoSource(successfulImages);
            
            if (failedCount > 0) {
                setError(`${successfulImages.length}°³ÀÇ ÀÌ¹ÌÁö°¡ »ý¼ºµÇ¾ú½À´Ï´Ù. ${failedCount}°³´Â »ý¼º¿¡ ½ÇÆÐÇß½À´Ï´Ù. ´ëº»À» ¼öÁ¤ÇÏ°Å³ª ´Ù½Ã ½ÃµµÇØº¸¼¼¿ä.`);
            } else if (successfulImages.length === 0) {
                setError('¸ðµç ÀÌ¹ÌÁö »ý¼º¿¡ ½ÇÆÐÇß½À´Ï´Ù. API Å°¸¦ È®ÀÎÇÏ°Å³ª ´ëº»À» ¼öÁ¤ÇÑ ÈÄ ´Ù½Ã ½ÃµµÇØº¸¼¼¿ä.');
            }
        } catch (e) {
            console.error('¿µ»ó ¼Ò½º »ý¼º ¿À·ù:', e);
            let errorMessage = '¿µ»ó ¼Ò½º »ý¼º Áß ¾Ë ¼ö ¾ø´Â ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù.';
            
            if (e instanceof Error) {
                const message = e.message.toLowerCase();
                if (message.includes('api')) {
                    errorMessage = 'API È£Ãâ¿¡ ½ÇÆÐÇß½À´Ï´Ù. API Å°¸¦ È®ÀÎÇÏ°Å³ª Àá½Ã ÈÄ ´Ù½Ã ½ÃµµÇØº¸¼¼¿ä.';
                } else if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
                    errorMessage = 'API »ç¿ë·® ÇÑµµ¿¡ µµ´ÞÇß½À´Ï´Ù. Àá½Ã ÈÄ ´Ù½Ã ½ÃµµÇÏ°Å³ª ÀÌ¹ÌÁö °³¼ö¸¦ ÁÙ¿©º¸¼¼¿ä.';
                } else if (message.includes('network') || message.includes('fetch')) {
                    errorMessage = '³×Æ®¿öÅ© ¿À·ù°¡ ¹ß»ýÇß½À´Ï´Ù. ÀÎÅÍ³Ý ¿¬°áÀ» È®ÀÎÇØÁÖ¼¼¿ä.';
                } else {
                    errorMessage = `¿À·ù: ${e.message}`;
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
            setError('Google Gemini API Å°¸¦ ÀÔ·ÂÇØÁÖ¼¼¿ä.');
            return;
        }
        const itemToRegenerate = videoSource.find(item => item.id === videoSourceItemId);
        if (!itemToRegenerate) return;

        try {
            // Ä¿½ºÅÒ ÇÁ·ÒÇÁÆ®°¡ ÀÖÀ¸¸é Àå¸é ¼³¸í¿¡ Ãß°¡
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
            console.error('¿µ»ó ¼Ò½º Àç»ý¼º ¿À·ù:', e);
            const errorMessage = e instanceof Error 
                ? `¿µ»ó ¼Ò½º ÀÌ¹ÌÁö Àç»ý¼º ½ÇÆÐ: ${e.message}` 
                : '¿µ»ó ¼Ò½º ÀÌ¹ÌÁö Àç»ý¼º¿¡ ½ÇÆÐÇß½À´Ï´Ù.';
            setError(errorMessage);
        }
    }, [videoSource, characters, apiKey, imageStyle, subtitleEnabled, referenceImage, aspectRatio]);

    // ÄíÆÎÆÄÆ®³Ê½º ¸µÅ© ·£´ý ¼±ÅÃ ÇÔ¼ö
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

        // ´Ù¿î·Îµå ½ÃÀÛ Àü¿¡ ÄíÆÎ ¸µÅ© ¿­±â
        openRandomCoupangLink();

        setIsDownloading(true);
        setError(null);
        try {
            const zip = new JSZip();
            videoSource.forEach((item, index) => {
                const safeDescription = item.sceneDescription.replace(/[^a-zA-Z0-9¤¡-¤¾¤¿-¤Ó°¡-ÆR]/g, '_').substring(0, 30);
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
                ? `ZIP ÆÄÀÏ »ý¼º ½ÇÆÐ: ${e.message}` 
                : 'ZIP ÆÄÀÏ ´Ù¿î·Îµå¿¡ ½ÇÆÐÇß½À´Ï´Ù.';
            setError(errorMessage);
        } finally {
            setIsDownloading(false);
        }
    }, [videoSource]);

    // ¶ó¿ìÆÃ Ã³¸®
    if (currentView === 'api-guide') {
        return (
            <>
                <MetaTags 
                    title="API ¹ß±Þ °¡ÀÌµå - À¯Æ©ºê ·ÕÆû ÀÌ¹ÌÁö »ý¼º±â"
                    description="Google Gemini API Å° ¹ß±Þ ¹æ¹ýÀ» ´Ü°èº°·Î ¾È³»ÇÕ´Ï´Ù. ¹«·á·Î À¯Æ©ºê ÄÜÅÙÃ÷¿ë AI ÀÌ¹ÌÁö¸¦ »ý¼ºÇÏ¼¼¿ä."
                    url="https://youtube-image.money-hotissue.com/api_¹ß±Þ_°¡ÀÌµå"
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
                    title="À¯Æ©ºê ÀÌ¹ÌÁö »ý¼º±â »ç¿ë¹ý °¡ÀÌµå - AI·Î ÄÜÅÙÃ÷ Á¦ÀÛÇÏ±â"
                    description="AI¸¦ È°¿ëÇÏ¿© À¯Æ©ºê Æä¸£¼Ò³ª¿Í ¿µ»ó ¼Ò½º¸¦ »ý¼ºÇÏ´Â ¹æ¹ýÀ» »ó¼¼È÷ ¾Ë·Áµå¸³´Ï´Ù. ´Ü°èº° °¡ÀÌµå·Î ½±°Ô µû¶óÇÏ¼¼¿ä."
                    url="https://youtube-image.money-hotissue.com/À¯Æ©ºê_ÀÌ¹ÌÁö_»ý¼º±â_»ç¿ë¹ý_°¡ÀÌµå"
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
                title="À¯Æ©ºê ·ÕÆû ÀÌ¹ÌÁö »ý¼º±â - AI·Î Ä³¸¯ÅÍ¿Í ½ºÅä¸®º¸µå ¸¸µé±â"
                description="Google Gemini AI¸¦ È°¿ëÇØ À¯Æ©ºê ÄÜÅÙÃ÷¿ë Æä¸£¼Ò³ª¿Í ¿µ»ó ¼Ò½º¸¦ ½±°í ºü¸£°Ô »ý¼ºÇÏ¼¼¿ä. ´Ù¾çÇÑ ºñÀ²(9:16, 16:9, 1:1) Áö¿ø."
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
                            À¯Æ©ºê ·ÕÆû ÀÌ¹ÌÁö »ý¼º±â
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
                    <p className="text-gray-400 mb-6">½ºÅ©¸³Æ®¸¦ ÀÔ·ÂÇÏ°í ÀÏ°üµÈ Ä³¸¯ÅÍ¿Í ¿µ»ó ¼Ò½º ÀÌ¹ÌÁö¸¦ »ý¼ºÇÏ¼¼¿ä!</p>
                    <nav className="flex justify-center gap-4">
                        <button 
                            onClick={() => {
                                setCurrentView('user-guide');
                                window.history.pushState({}, '', '/user-guide');
                            }}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700 text-sm font-medium"
                        >
                            ?? »ç¿ë¹ý
                        </button>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700 text-sm font-medium"
                        >
                            ??? API ¹ß±Þ
                        </a>
                    </nav>
                </header>
                
                <main className="space-y-6">
                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">1??</span>
                            API Å° ÀÔ·Â
                        </h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => handleApiKeyChange(e.target.value)}
                                    placeholder="Google Gemini API Å°¸¦ ÀÔ·ÂÇÏ¼¼¿ä..."
                                    className="flex-1 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
                                />
                                <button 
                                    onClick={() => {
                                        setCurrentView('api-guide');
                                        window.history.pushState({}, '', '/api-guide');
                                    }}
                                    className="px-4 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                                >
                                    ?? ¹ß±Þ ¹æ¹ý
                                </button>
                            </div>
                            
                            {/* API Å° ÀúÀå ¿É¼Ç */}
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
                                            <strong className="text-green-400">? API Å° ±â¾ïÇÏ±â</strong>
                                            <span className="text-gray-400 text-xs ml-1 block">
                                                {rememberApiKey ? 'ºê¶ó¿ìÀú¿¡ ¾ÏÈ£È­ ÀúÀåµÊ' : 'ÅÇ ´ÝÀ¸¸é »èÁ¦µÊ'}
                                            </span>
                                        </span>
                                    </label>
                                    
                                    {apiKey && (
                                        <button
                                            onClick={handleClearApiKey}
                                            className="text-red-400 hover:text-red-300 text-sm underline"
                                        >
                                            ÀúÀåµÈ Å° »èÁ¦
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* º¸¾È ¾È³» */}
                            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <span className="text-amber-500 text-lg flex-shrink-0">??</span>
                                    <div className="text-sm space-y-1">
                                        <p className="text-amber-400 font-semibold">º¸¾È ¾È³»</p>
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            ? API Å°´Â {rememberApiKey ? '¾ÏÈ£È­µÇ¾î ºê¶ó¿ìÀú¿¡¸¸' : 'ÇöÀç ¼¼¼Ç¿¡¸¸'} ÀúÀåµÇ¸ç, ¿ÜºÎ ¼­¹ö·Î Àü¼ÛµÇÁö ¾Ê½À´Ï´Ù<br/>
                                            ? °ø¿ë ÄÄÇ»ÅÍ¸¦ »ç¿ëÇÏ´Â °æ¿ì "±â¾ïÇÏ±â"¸¦ Ã¼Å©ÇÏÁö ¸¶¼¼¿ä<br/>
                                            ? API Å°°¡ À¯ÃâµÈ °æ¿ì Áï½Ã Google AI Studio¿¡¼­ Àç¹ß±Þ ¹ÞÀ¸¼¼¿ä
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* API ºñ¿ë ¾È³» */}
                            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-500 text-lg flex-shrink-0">??</span>
                                    <div className="text-sm space-y-1">
                                        <p className="text-blue-400 font-semibold">API ºñ¿ë ¾È³»</p>
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            ? Gemini API ¹«·á µî±Þ¿¡¼­ ÀÌ¹ÌÁö »ý¼º ±â´É Á¦°ø<br/>
                                            ? <span className="text-blue-400 font-semibold">ºÐ´ç 15È¸ ¿äÃ»</span> Á¦ÇÑ¸¸ ÀÖ°í, °áÁ¦³ª ºñ¿ë ¹ß»ý ¾øÀ½<br/>
                                            ? ºÐ´ç ¿äÃ» ¼ö¸¸ ÁöÅ°¸é <span className="text-blue-400 font-semibold">¹«·á</span>·Î »ç¿ë °¡´É
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ±¤°í 1: API Å°¿Í Æä¸£¼Ò³ª »ý¼º »çÀÌ */}
                    <AdBanner />

                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">2??</span>
                            Æä¸£¼Ò³ª »ý¼º
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                ±¸Ã¼ÀûÀÎ ÀÎ¹° ¹¦»ç¸¦ ÀÔ·ÂÇÏ°Å³ª, ´ëº»À» ³ÖÀ¸¸é µîÀåÀÎ¹°µéÀ» ÀÚµ¿À¸·Î ºÐ¼®ÇÏ¿© »ý¼ºÇÕ´Ï´Ù.
                            </p>
                            <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4 mb-4">
                                <p className="text-purple-200 text-sm mb-2"><strong>ÀÔ·Â ¿¹½Ã:</strong></p>
                                <ul className="text-purple-300 text-sm space-y-1 ml-4">
                                    <li>? <strong>ÀÎ¹° ¹¦»ç:</strong> "20´ë Áß¹Ý ¿©¼º, ±ä Èæ¹ß, ¹àÀº ¹Ì¼Ò, Ä³ÁÖ¾óÇÑ ¿ÊÂ÷¸²"</li>
                                    <li>? <strong>´ëº» ÀÔ·Â:</strong> ÀüÃ¼ ½ºÅä¸® ´ëº»À» ³ÖÀ¸¸é µîÀåÀÎ¹° ÀÚµ¿ ÃßÃâ</li>
                                </ul>
                            </div>
                        </div>
                        <textarea
                            value={personaInput}
                            onChange={(e) => setPersonaInput(e.target.value)}
                            placeholder="ÀÎ¹° ¹¦»ç³ª ´ëº»À» ÀÔ·ÂÇÏ¼¼¿ä..."
                            className="w-full h-48 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 resize-y mb-6"
                        />

                        {/* ÀÌ¹ÌÁö ½ºÅ¸ÀÏ ¼±ÅÃ */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-6 flex items-center">
                                <span className="mr-2">??</span>
                                ÀÌ¹ÌÁö ½ºÅ¸ÀÏ ¼±ÅÃ
                            </h3>
                            
                            {/* ÀÎ¹° ½ºÅ¸ÀÏ */}
                            <div className="mb-6">
                                <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                                    <span className="mr-2">??</span>
                                    ÀÎ¹° ½ºÅ¸ÀÏ
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(['½Ç»ç ±Ø´ëÈ­', '¾Ö´Ï¸ÞÀÌ¼Ç', 'µ¿¹°', '1980³â´ë', '2000³â´ë'] as CharacterStyle[]).map((style) => {
                                        const styleDescriptions: Record<CharacterStyle, string> = {
                                            '½Ç»ç ±Ø´ëÈ­': '?? ÃÊÇö½ÇÀûÀÌ°í »çÁø °°Àº Ä÷¸®Æ¼ÀÇ ½Ç»ç ÀÎ¹°',
                                            '¾Ö´Ï¸ÞÀÌ¼Ç': '?? ¹à°í È­·ÁÇÑ ¾Ö´Ï¸ÞÀÌ¼Ç ½ºÅ¸ÀÏ Ä³¸¯ÅÍ',
                                            'µ¿¹°': '?? ±Í¿©¿î µ¿¹° Ä³¸¯ÅÍ·Î º¯È¯',
                                            '1980³â´ë': '?? 80³â´ë ÆÐ¼Ç°ú Çì¾î½ºÅ¸ÀÏ',
                                            '2000³â´ë': '?? 2000³â´ë ÃÊ¹Ý ÆÐ¼Ç°ú ½ºÅ¸ÀÏ',
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
                                                                <div className="text-purple-200 font-medium text-xs mb-2 text-center">{style} ¹Ì¸®º¸±â</div>
                                                                <img 
                                                                    src={`/${style}.png`}
                                                                    alt={`${style} ½ºÅ¸ÀÏ ¹Ì¸®º¸±â`}
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
                                        Á÷Á¢ ÀÔ·Â
                                    </button>
                                </div>
                                {characterStyle === 'custom' && (
                                    <input
                                        type="text"
                                        value={customCharacterStyle}
                                        onChange={(e) => setCustomCharacterStyle(e.target.value)}
                                        placeholder="¿øÇÏ´Â ÀÎ¹° ½ºÅ¸ÀÏÀ» ÀÔ·ÂÇÏ¼¼¿ä (¿¹: ¸£³×»ó½º, ºòÅä¸®¾Æ ½Ã´ë µî)"
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3"
                                    />
                                )}
                            </div>

                            {/* ¹è°æ/ºÐÀ§±â ½ºÅ¸ÀÏ */}
                            <div>
                                <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                                    <span className="mr-2">??</span>
                                    ¹è°æ/ºÐÀ§±â ½ºÅ¸ÀÏ
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                                    {(['°¨¼º ¸á·Î', '¼­ºÎ±Ø', '°øÆ÷ ½º¸±·¯', '»çÀÌ¹öÆãÅ©', 'ÆÇÅ¸Áö', '¹Ì´Ï¸Ö', 'ºóÆ¼Áö', '¸ð´ø', '¸Ô¹æ', '±Í¿©¿ò', 'AI', '±«ÀÌÇÔ', 'Ã¢ÀÇÀûÀÎ'] as BackgroundStyle[]).map((style) => {
                                        const styleDescriptions: Record<BackgroundStyle, string> = {
                                            '°¨¼º ¸á·Î': '?? ·Î¸ÇÆ½ÇÏ°í °¨¼ºÀûÀÎ µû¶æÇÑ ºÐÀ§±â',
                                            '¼­ºÎ±Ø': '?? °ÅÄ£ »ç¸·°ú Ä«¿ìº¸ÀÌ ¹è°æ',
                                            '°øÆ÷ ½º¸±·¯': '?? ¹Ì½ºÅÍ¸®ÇÏ°í ±äÀå°¨ ÀÖ´Â ºÐÀ§±â',
                                            '»çÀÌ¹öÆãÅ©': '?? ³×¿Â»çÀÎ °¡µæÇÑ ¹Ì·¡ µµ½Ã',
                                            'ÆÇÅ¸Áö': '???¡Î? ¸¶¹ýÀûÀÌ°í ½Åºñ·Î¿î Áß¼¼ ¹è°æ',
                                            '¹Ì´Ï¸Ö': '? ±ò²ûÇÏ°í ´Ü¼øÇÑ Áß¼ºÅæ ¹è°æ',
                                            'ºóÆ¼Áö': '?? Å¬·¡½ÄÇÏ°í Çâ¼ö¸¦ ÀÚ¾Æ³»´Â ¹è°æ',
                                            '¸ð´ø': '?? Çö´ëÀûÀÌ°í ¼¼·ÃµÈ µµ½Ã ¹è°æ',
                                            '¸Ô¹æ': '??? ¸ÀÀÖ´Â À½½ÄÀÌ °¡µæÇÑ ¸Ô¹æ ºÐÀ§±â',
                                            '±Í¿©¿ò': '?? ±Í¿±°í »ç¶û½º·¯¿î ÆÄ½ºÅÚ °¨¼º',
                                            'AI': '?? ¹Ì·¡ÁöÇâÀûÀÎ ÇÏÀÌÅ×Å© AI ºÐÀ§±â',
                                            '±«ÀÌÇÔ': '??? µ¶Æ¯ÇÏ°í ÃÊÇö½ÇÀûÀÎ ±â¹¦ÇÑ ºÐÀ§±â',
                                            'Ã¢ÀÇÀûÀÎ': '?? »ó»ó·Â ³ÑÄ¡´Â µ¶Ã¢ÀûÀÎ ¿¹¼ú ºÐÀ§±â',
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
                                                                <div className="text-purple-200 font-medium text-xs mb-2 text-center">{style} ¹Ì¸®º¸±â</div>
                                                                <img 
                                                                    src={`/${style === 'AI' ? 'ai' : style}.png`}
                                                                    alt={`${style} ½ºÅ¸ÀÏ ¹Ì¸®º¸±â`}
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
                                        Á÷Á¢ ÀÔ·Â
                                    </button>
                                </div>
                                {backgroundStyle === 'custom' && (
                                    <input
                                        type="text"
                                        value={customBackgroundStyle}
                                        onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                                        placeholder="¿øÇÏ´Â ¹è°æ/ºÐÀ§±â¸¦ ÀÔ·ÂÇÏ¼¼¿ä (¿¹: ¿ìÁÖ Á¤°ÅÀå, ¿­´ë ÇØº¯ µî)"
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mt-3"
                                    />
                                )}
                            </div>
                        </div>

                        {/* »çÁø ¼³Á¤ (±¸µµ ¹× ºñÀ²) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-4 flex items-center">
                                <span className="mr-2">??</span>
                                »çÁø ¼³Á¤
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* ¿ÞÂÊ: »çÁø ±¸µµ ¼±ÅÃ */}
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        »çÁø ±¸µµ
                                    </label>
                                    <select
                                        value={photoComposition}
                                        onChange={(e) => setPhotoComposition(e.target.value as PhotoComposition)}
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-white"
                                    >
                                        <option value="Á¤¸é">Á¤¸é (±âº»)</option>
                                        <option value="Ãø¸é">Ãø¸é</option>
                                        <option value="¹ÝÃø¸é">¹ÝÃø¸é</option>
                                        <option value="À§¿¡¼­">À§¿¡¼­</option>
                                        <option value="¾Æ·¡¿¡¼­">¾Æ·¡¿¡¼­</option>
                                        <option value="Àü½Å">Àü½Å</option>
                                        <option value="»ó¹Ý½Å">»ó¹Ý½Å</option>
                                        <option value="Å¬·ÎÁî¾÷">Å¬·ÎÁî¾÷</option>
                                    </select>
                                </div>

                                {/* ¿À¸¥ÂÊ: ÀÌ¹ÌÁö ºñÀ² ¼±ÅÃ */}
                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        ÀÌ¹ÌÁö ºñÀ²
                                    </label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                        className="w-full p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-white"
                                    >
                                        <option value="9:16">?? 9:16 - ¸ð¹ÙÀÏ ¼¼·Î</option>
                                        <option value="16:9">??? 16:9 - µ¥½ºÅ©Åé °¡·Î</option>
                                        <option value="1:1">? 1:1 - Á¤»ç°¢Çü</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-3">
                                ?? »çÁø ±¸µµ¿Í ÀÌ¹ÌÁö ºñÀ²À» Á¶ÇÕÇÏ¿© ¿øÇÏ´Â ½ºÅ¸ÀÏÀÇ ÀÌ¹ÌÁö¸¦ ¸¸µå¼¼¿ä.
                            </div>
                        </div>

                        {/* Ä¿½ºÅÒ ÇÁ·ÒÇÁÆ® (¼±ÅÃ»çÇ×) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-purple-300 font-medium flex items-center">
                                    <span className="mr-2">?</span>
                                    Ä¿½ºÅÒ ÀÌ¹ÌÁö ÇÁ·ÒÇÁÆ® (¼±ÅÃ»çÇ×)
                                </h3>
                                <button
                                    onClick={() => {
                                        setCurrentView('image-prompt');
                                        window.history.pushState({}, '', '/image-prompt');
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex items-center"
                                >
                                    <span className="mr-2">??</span>
                                    ³»°¡ ¿øÇÏ´Â ÀÌ¹ÌÁö 200% »Ì´Â ³ëÇÏ¿ì
                                </button>
                            </div>
                            
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="°í±Þ »ç¿ëÀÚ¿ë: AI¿¡°Ô Àü´ÞÇÒ ±¸Ã¼ÀûÀÎ ÀÌ¹ÌÁö ÇÁ·ÒÇÁÆ®¸¦ Á÷Á¢ ÀÔ·ÂÇÏ¼¼¿ä (¿µ¾î ±ÇÀå)"
                                className="w-full h-24 p-3 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-y"
                            />
                            <p className="text-gray-400 text-xs mt-2">
                                ?? ÀÌ ÇÊµå´Â °í±Þ »ç¿ëÀÚ¸¦ À§ÇÑ ±â´ÉÀÔ´Ï´Ù. ºñ¿öµÎ¸é ÀÚµ¿À¸·Î ÃÖÀûÈ­µÈ ÇÁ·ÒÇÁÆ®°¡ »ý¼ºµË´Ï´Ù.
                            </p>
                        </div>

                        {/* ÀÏ°ü¼º À¯Áö (¼±ÅÃ»çÇ×) */}
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                            <h3 className="text-purple-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">??</span>
                                ÀÏ°ü¼º À¯Áö (¼±ÅÃ»çÇ×)
                            </h3>
                            <p className="text-purple-200 text-sm mb-3">
                                ÂüÁ¶ ÀÌ¹ÌÁö¸¦ ¾÷·ÎµåÇÏ¸é ÇØ´ç ÀÌ¹ÌÁöÀÇ ½ºÅ¸ÀÏ°ú ÀÏ°ü¼ºÀ» À¯ÁöÇÏ¸ç Æä¸£¼Ò³ª¸¦ »ý¼ºÇÕ´Ï´Ù.
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
                                        <div className="text-purple-300 font-medium">ÂüÁ¶ ÀÌ¹ÌÁö ¾÷·Îµå</div>
                                        <div className="text-purple-400 text-sm">Å¬¸¯ÇÏ¿© ÀÌ¹ÌÁö¸¦ ¼±ÅÃÇÏ¼¼¿ä</div>
                                    </label>
                                </div>
                            ) : (
                                <div className="relative bg-[#121212] rounded-lg p-4">
                                    <div className="flex items-center space-x-4">
                                        <img 
                                            src={`data:image/jpeg;base64,${referenceImage}`}
                                            alt="ÂüÁ¶ ÀÌ¹ÌÁö"
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <div className="text-purple-300 font-medium">ÂüÁ¶ ÀÌ¹ÌÁö ¾÷·ÎµåµÊ</div>
                                            <div className="text-purple-400 text-sm">ÀÌ ÀÌ¹ÌÁöÀÇ ½ºÅ¸ÀÏÀ» Âü°íÇÏ¿© Æä¸£¼Ò³ª¸¦ »ý¼ºÇÕ´Ï´Ù</div>
                                        </div>
                                        <button
                                            onClick={handleRemoveReferenceImage}
                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                        >
                                            »èÁ¦
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* ÄÜÅÙÃ÷ Á¤Ã¥ À§¹Ý °æ°í */}
                        {contentWarning && !isContentWarningAcknowledged && (
                            <div className="mt-4 bg-orange-900/50 border border-orange-500 text-orange-300 p-4 rounded-lg">
                                <div className="flex items-start">
                                    <span className="text-orange-400 text-xl mr-3">??</span>
                                    <div className="flex-1">
                                        <p className="font-medium mb-2">ÄÜÅÙÃ÷ Á¤Ã¥ À§¹Ý °¡´É¼ºÀÌ ÀÖ´Â ´Ü¾î°¡ °¨ÁöµÇ¾ú½À´Ï´Ù</p>
                                        <div className="mb-3">
                                            <p className="text-sm text-orange-200 mb-2">°¨ÁöµÈ ´Ü¾î:</p>
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
                                                ?? ¾ÈÀüÇÑ ´Ü¾î·Î ÀÚµ¿ ±³Ã¼
                                            </button>
                                            <button
                                                onClick={handleAcknowledgeWarning}
                                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                È®ÀÎÇÏ°í °è¼Ó
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
                            {isLoadingCharacters ? <><Spinner size="sm" /> <span className="ml-2">Æä¸£¼Ò³ª »ý¼º Áß...</span></> : 'Æä¸£¼Ò³ª »ý¼º'}
                        </button>
                    </section>

                    {/* Æä¸£¼Ò³ª »ý¼º °ü·Ã ¿À·ù Ç¥½Ã */}
                    {personaError && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-red-400 text-xl mr-3">??</span>
                                <div className="flex-1">
                                    <p className="font-medium mb-2">{personaError}</p>
                                    {personaError.includes('content policy') || personaError.includes('policy restrictions') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>ÇØ°á ¹æ¹ý:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? Ä³¸¯ÅÍ ÀÌ¸§À» ´õ ÀÏ¹ÝÀûÀ¸·Î º¯°æ (¿¹: "¹Ì½ºÅÍ¸®ÇÑ °ø¹ü" ¡æ "½Åºñ·Î¿î ÀÎ¹°")</li>
                                                <li>? Æø·ÂÀûÀÌ°Å³ª ¼±Á¤ÀûÀÎ Ç¥Çö Á¦°Å</li>
                                                <li>? ±àÁ¤ÀûÀÌ°í °ÇÀüÇÑ Ä³¸¯ÅÍ·Î ¼öÁ¤</li>
                                            </ul>
                                        </div>
                                    ) : personaError.includes('API Å°') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>API Å° ¹®Á¦ ÇØ°á:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? API Å°°¡ Á¤È®È÷ ÀÔ·ÂµÇ¾ú´ÂÁö È®ÀÎ</li>
                                                <li>? Google AI Studio¿¡¼­ »õ API Å° ¹ß±Þ</li>
                                                <li>? API Å°¿¡ Gemini »ç¿ë ±ÇÇÑÀÌ ÀÖ´ÂÁö È®ÀÎ</li>
                                            </ul>
                                        </div>
                                    ) : null}
                                    <button 
                                        onClick={() => setPersonaError(null)}
                                        className="mt-3 text-red-400 hover:text-red-300 text-sm underline"
                                    >
                                        ¿À·ù ¸Þ½ÃÁö ´Ý±â
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoadingCharacters && (
                        <div className="text-center p-8">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">µîÀåÀÎ¹°À» ºÐ¼®ÇÏ°í ÀÌ¹ÌÁö¸¦ »ý¼ºÇÏ°í ÀÖ½À´Ï´Ù... Àá½Ã¸¸ ±â´Ù·Á ÁÖ¼¼¿ä.</p>
                        </div>
                    )}

                    {characters.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-purple-300">»ý¼ºµÈ Æä¸£¼Ò³ª</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {characters.map(char => (
                                    <CharacterCard key={char.id} character={char} onRegenerate={handleRegenerateCharacter} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ±¤°í 2: Æä¸£¼Ò³ª »ý¼º°ú ¿µ»ó ¼Ò½º »ý¼º »çÀÌ */}
                    <AdBanner />

                    {/* 3´Ü°è´Â Ç×»ó Ç¥½Ã */}
                    <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
                            <span className="mr-2">3??</span>
                            ¿µ»ó ¼Ò½º »ý¼º
                        </h2>
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-3">
                                À§¿¡¼­ »ý¼ºÇÑ Æä¸£¼Ò³ª¸¦ È°¿ëÇÏ¿© ¿µ»ó ¼Ò½º¸¦ ¸¸µì´Ï´Ù. ´ëº» ¶Ç´Â ½ÃÄö½ºº° Àå¸éÀ» ÀÔ·ÂÇØÁÖ¼¼¿ä.
                            </p>
                            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                                <p className="text-green-200 text-sm mb-2"><strong>ÀÔ·Â ¹æ¹ý:</strong></p>
                                <ul className="text-green-300 text-sm space-y-1 ml-4">
                                    <li>? <strong>ÀüÃ¼ ´ëº»:</strong> ¿ÏÀüÇÑ ½ºÅ©¸³Æ®³ª ½ºÅä¸®¸¦ ÀÔ·Â</li>
                                    <li>? <strong>½ÃÄö½ºº° Àå¸é:</strong> °¢ ÁÙ¿¡ ÇÏ³ª¾¿ Àå¸é ¼³¸íÀ» ÀÔ·Â</li>
                                </ul>
                            </div>
                        </div>
                        <textarea
                            value={videoSourceScript}
                            onChange={(e) => setVideoSourceScript(e.target.value)}
                            placeholder="´ëº» ÀüÃ¼¸¦ ³ÖÀ¸¼¼¿ä. ¶Ç´Â ½ÃÄö½ºº° ¿øÇÏ´Â Àå¸éÀ» ³ÖÀ¸¼¼¿ä.

¿¹½Ã:
1. ¹Ì·¡ µµ½Ã ¿Á»ó¿¡¼­ ·Îº¿ÀÌ »õº®À» ¹Ù¶óº¸¸ç ¼­ ÀÖ´Â Àå¸é
2. °øÁßÁ¤¿ø¿¡¼­ È¦·Î±×·¥ ³ªºñµéÀÌ ÃãÃß´Â ¸ð½À  
3. ³×¿Â»çÀÎÀÌ ¹Ý»çµÈ ºø¼Ó °Å¸®¸¦ °É¾î°¡´Â »çÀÌº¸±×
4. ¿ìÁÖ Á¤°ÅÀå Ã¢¹® ³Ê¸Ó·Î Áö±¸¸¦ ³»·Á´Ùº¸´Â Àå¸é"
                            className="w-full h-48 p-4 bg-[#121212] border-2 border-[#2A2A2A] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 resize-y mb-4"
                        />
                        
                        {/* »ý¼º ¿É¼Ç ¼³Á¤ */}
                        <div className="mb-4 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                            <h3 className="text-green-300 font-medium mb-3 flex items-center">
                                <span className="mr-2">??</span>
                                »ý¼º ¿É¼Ç ¼³Á¤
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ÀÚ¸· ¼³Á¤ */}
                                <div>
                                    <label className="block text-sm font-medium text-green-200 mb-2">
                                        ?? ÀÚ¸· ¼³Á¤
                                    </label>
                                    <select
                                        value={subtitleEnabled ? 'on' : 'off'}
                                        onChange={(e) => setSubtitleEnabled(e.target.value === 'on')}
                                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-green-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="off">?? ÀÚ¸· OFF (±âº»°ª)</option>
                                        <option value="on">?? ÀÚ¸· ON</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        ÀÚ¸· Æ÷ÇÔ ¿©ºÎ¸¦ ¼±ÅÃÇÏ¼¼¿ä
                                    </p>
                                </div>

                                {/* ÀÌ¹ÌÁö ¼ö ¼³Á¤ */}
                                <div>
                                    <Slider 
                                        label="»ý¼ºÇÒ ÀÌ¹ÌÁö ¼ö"
                                        min={5}
                                        max={20}
                                        value={Math.min(imageCount, 20)}
                                        onChange={(e) => setImageCount(parseInt(e.target.value))}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        ¾ÈÁ¤ÀûÀÎ »ý¼ºÀ» À§ÇØ ÃÖ´ë 20°³·Î Á¦ÇÑ
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
                                {isLoadingVideoSource ? <><Spinner size="sm" /> <span className="ml-2">¿µ»ó ¼Ò½º »ý¼º Áß...</span></> : '¿µ»ó ¼Ò½º »ý¼º'}
                            </button>
                        </div>
                    </section>

                    {/* ¿µ»ó ¼Ò½º »ý¼º °ü·Ã ¿À·ù Ç¥½Ã */}
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-red-400 text-xl mr-3">??</span>
                                <div className="flex-1">
                                    <p className="font-medium mb-2">{error}</p>
                                    {error.includes('content policy') || error.includes('policy restrictions') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>ÇØ°á ¹æ¹ý:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? ´ëº» ³»¿ëÀ» ´õ ÀÏ¹ÝÀûÀÌ°í ±àÁ¤ÀûÀ¸·Î ¼öÁ¤</li>
                                                <li>? Æø·ÂÀûÀÌ°Å³ª ¼±Á¤ÀûÀÎ Àå¸é Á¦°Å</li>
                                                <li>? ´õ °ÇÀüÇÏ°í ±àÁ¤ÀûÀÎ ³»¿ëÀ¸·Î ¼öÁ¤</li>
                                                <li>? ±¸Ã¼ÀûÀÎ Àå¸é ¼³¸í¿¡ ÁýÁß</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('API Å°') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>API Å° ¹®Á¦ ÇØ°á:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? API Å°°¡ Á¤È®È÷ ÀÔ·ÂµÇ¾ú´ÂÁö È®ÀÎ</li>
                                                <li>? Google AI Studio¿¡¼­ »õ API Å° ¹ß±Þ</li>
                                                <li>? API Å°¿¡ Gemini »ç¿ë ±ÇÇÑÀÌ ÀÖ´ÂÁö È®ÀÎ</li>
                                            </ul>
                                        </div>
                                    ) : error.includes('quota') || error.includes('limit') ? (
                                        <div className="bg-red-800/30 rounded p-3 mt-2">
                                            <p className="text-sm text-red-200 mb-2"><strong>ÇØ°á ¹æ¹ý:</strong></p>
                                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                                                <li>? 5-10ºÐ ÈÄ ´Ù½Ã ½Ãµµ</li>
                                                <li>? ÇÑ ¹ø¿¡ »ý¼ºÇÒ ÀÌ¹ÌÁö ¼ö¸¦ ÁÙ¿©º¸¼¼¿ä</li>
                                                <li>? Google Cloud Console¿¡¼­ ÇÒ´ç·® È®ÀÎ</li>
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
                            <p className="mt-4 text-gray-400">Àå¸éÀ» ¸¸µé°í ÀÖ½À´Ï´Ù... ÀÌ ÀÛ¾÷Àº ½Ã°£ÀÌ °É¸± ¼ö ÀÖ½À´Ï´Ù.</p>
                        </div>
                    )}
                    
                    {videoSource.length > 0 && (
                        <section>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-2xl font-bold text-indigo-300">»ý¼ºµÈ ¿µ»ó ¼Ò½º</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGenerateVideoSource}
                                        disabled={isLoadingVideoSource || !videoSourceScript.trim() || !apiKey.trim() || (hasContentWarning && !isContentWarningAcknowledged)}
                                        className="px-4 py-2 bg-blue-600 font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                    >
                                        {isLoadingVideoSource ? <><Spinner size="sm" /><span className="ml-2">»ý¼º Áß...</span></> : 'ÇÑ ¹ø ´õ »ý¼º'}
                                    </button>
                                    <button
                                        onClick={handleDownloadAllImages}
                                        disabled={isDownloading}
                                        className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                                    >
                                        {isDownloading ? <><Spinner size="sm" /><span className="ml-2">¾ÐÃà Áß...</span></> : '¸ðµç ÀÌ¹ÌÁö ÀúÀå'}
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
                            <h3 className="text-xl font-bold mb-2">?? ´õ ¸¹Àº ¿µ»ó Á¦ÀÛ µµ±¸°¡ ÇÊ¿äÇÏ½Å°¡¿ä?</h3>
                            <p className="mb-4">ÇÁ·ÎÆä¼Å³ÎÇÑ ¿µ»ó ÆíÁý°ú È¿°ú¸¦ À§ÇÑ µµ±¸µéÀ» È®ÀÎÇØº¸¼¼¿ä!</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="https://youtube-analyze.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? ¶±»óÇÑ ´ëº» 1ºÐ Ä«ÇÇ
                                </a>
                                <a href="https://aimusic-l.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? AI À½¾Ç °¡»ç 1ÃÊ ¿Ï¼º
                                </a>
                                <a href="https://aimusic-i.money-hotissue.com" className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer">
                                    ?? AI À½¾Ç ½æ³×ÀÏ Á¦ÀÛ
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





