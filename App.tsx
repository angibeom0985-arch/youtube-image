import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Character, StoryboardImage as StoryboardImageType } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import CharacterCard from './components/CharacterCard';
import StoryboardImage from './components/StoryboardImage';
import Slider from './components/Slider';

const App: React.FC = () => {
    const [script, setScript] = useState<string>('');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [storyboard, setStoryboard] = useState<StoryboardImageType[]>([]);
    const [imageCount, setImageCount] = useState<number>(5);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
    const [isLoadingStoryboard, setIsLoadingStoryboard] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePersonas = useCallback(async () => {
        if (!script) {
            setError('Please enter a script first.');
            return;
        }
        setIsLoadingCharacters(true);
        setError(null);
        setCharacters([]);
        setStoryboard([]);

        try {
            const generatedCharacters = await geminiService.generateCharacters(script);
            setCharacters(generatedCharacters);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred while generating personas.');
        } finally {
            setIsLoadingCharacters(false);
        }
    }, [script]);

    const handleRegenerateCharacter = useCallback(async (characterId: string, description: string, name: string) => {
        try {
            const newImage = await geminiService.regenerateCharacterImage(description, name);
            setCharacters(prev =>
                prev.map(char =>
                    char.id === characterId ? { ...char, image: newImage } : char
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Failed to regenerate character image.');
        }
    }, []);

    const handleGenerateStoryboard = useCallback(async () => {
        if (characters.length === 0) {
            setError('Please generate characters before creating a storyboard.');
            return;
        }
        setIsLoadingStoryboard(true);
        setError(null);
        setStoryboard([]);

        try {
            const generatedStoryboard = await geminiService.generateStoryboard(script, characters, imageCount);
            setStoryboard(generatedStoryboard.filter(item => item.image)); // Filter out any failed generations
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred while generating the storyboard.');
        } finally {
            setIsLoadingStoryboard(false);
        }
    }, [script, characters, imageCount]);

    const handleRegenerateStoryboardImage = useCallback(async (storyboardItemId: string) => {
        const itemToRegenerate = storyboard.find(item => item.id === storyboardItemId);
        if (!itemToRegenerate) return;

        try {
            const newImage = await geminiService.regenerateStoryboardImage(
                itemToRegenerate.sceneDescription,
                characters
            );
            setStoryboard(prev =>
                prev.map(item =>
                    item.id === storyboardItemId ? { ...item, image: newImage } : item
                )
            );
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Failed to regenerate storyboard image.');
        }
    }, [storyboard, characters]);

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
            setError("Failed to create zip file for download.");
        } finally {
            setIsDownloading(false);
        }
    }, [storyboard]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        Story to Persona Generator
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">대본을 인물과 장면으로 생생하게 구현하세요</p>
                </header>
                
                <main className="space-y-12">
                    <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">1. 대본 입력 (Enter Your Script)</h2>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="여기에 이야기 대본을 붙여넣으세요..."
                            className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-y"
                        />
                        <button
                            onClick={handleGeneratePersonas}
                            disabled={isLoadingCharacters || !script}
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
                            <h2 className="text-2xl font-bold mb-4 text-indigo-300">등장인물 페르소나 (Character Personas)</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {characters.map(char => (
                                    <CharacterCard key={char.id} character={char} onRegenerate={handleRegenerateCharacter} />
                                ))}
                            </div>
                        </section>
                    )}

                    {characters.length > 0 && (
                        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                            <h2 className="text-2xl font-bold mb-4 text-indigo-300">2. 스토리보드 생성 (Generate Storyboard)</h2>
                            <div className="space-y-4">
                               <Slider 
                                 label="이미지 수 (Number of Images)"
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
                            <p className="mt-4 text-gray-400">장면을 렌더링하고 있습니다... 이 작업은 시간이 걸릴 수 있습니다.</p>
                        </div>
                    )}
                    
                    {storyboard.length > 0 && (
                        <section>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-2xl font-bold text-indigo-300">생성된 스토리보드 (Generated Storyboard)</h2>
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
                </main>
            </div>
        </div>
    );
};

export default App;