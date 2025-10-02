import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { RawCharacterData, Character, AspectRatio, ImageStyle, PhotoComposition } from '../types';

// 디버그 모드 설정 (개발 환경에서만 로그 출력)
const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const debugLog = (...args: any[]) => {
    if (DEBUG_MODE) {
        console.log(...args);
    }
};

// 환경 변수에서 API 키를 가져오거나, 런타임에서 동적으로 설정
const getGoogleAI = (apiKey?: string) => {
    const key = apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("API 키가 설정되지 않았습니다. Google AI Studio에서 API 키를 발급받아 입력해주세요.");
    }
    return new GoogleGenAI({ apiKey: key });
};

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const extractJson = <T = unknown>(text: string): T => {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]) as T;
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            console.error("Failed to parse JSON from markdown:", errorMsg);
            throw new Error(`Invalid JSON format returned from API: ${errorMsg}`);
        }
    }
    // Fallback for raw JSON string
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error("Failed to parse raw JSON string:", errorMsg);
        throw new Error(`Could not find or parse JSON in the response: ${errorMsg}`);
    }
};

// 스타일 프롬프트 생성 함수
const getStylePrompt = (style: string): string => {
    const styleMap: Record<string, string> = {
        '감성 멜로': 'romantic and emotional atmosphere, soft warm lighting, dreamy mood',
        '서부극': 'western film style, rugged cowboy aesthetic, dusty desert atmosphere',
        '공포 스릴러': 'dark and mysterious atmosphere, dramatic shadows, suspenseful mood',
        '1980년대': '1980s retro style, vintage 80s fashion, neon colors, retro aesthetic',
        '2000년대': '2000s Y2K style, early 2000s fashion, urban contemporary look',
        '사이버펑크': 'cyberpunk futuristic style, neon lights, high-tech urban environment',
        '판타지': 'fantasy medieval style, magical atmosphere, enchanted setting',
        '미니멀': 'minimalist clean style, simple composition, neutral tones',
        '빈티지': 'vintage classic style, aged film aesthetic, nostalgic mood',
        '모던': 'modern contemporary style, clean urban aesthetic, sophisticated look',
        '동물': 'cute animal characters, adorable pets, charming wildlife, animal-friendly atmosphere',
        '실사 극대화': 'ultra-realistic, photographic quality, highly detailed, professional photography',
        '애니메이션': 'animated cartoon style, bright colors, anime illustration, stylized characters'
    };
    
    return styleMap[style] || style;
};

// 구도 프롬프트 생성 함수
const getCompositionPrompt = (composition: PhotoComposition): string => {
    const compositionMap: Record<PhotoComposition, string> = {
        '정면': 'Front view, facing camera directly',
        '측면': 'Side view, profile shot',
        '반측면': 'Three-quarter view, slightly turned',
        '위에서': 'High angle shot, view from above',
        '아래에서': 'Low angle shot, view from below',
        '전신': 'Full body shot, entire person visible',
        '상반신': 'Upper body shot, waist up portrait',
        '클로즈업': 'Close-up headshot, detailed facial features'
    };
    
    return compositionMap[composition];
};

export const generateCharacters = async (
    script: string, 
    apiKey?: string, 
    imageStyle: 'realistic' | 'animation' = 'realistic',
    aspectRatio: AspectRatio = '16:9',
    personaStyle?: ImageStyle,
    customStyle?: string,
    photoComposition?: PhotoComposition,
    customPrompt?: string
): Promise<Character[]> => {
    try {
        const ai = getGoogleAI(apiKey);
        
        debugLog("🚀 Starting character generation process");
        
        // 동물 스타일인지 확인
        const isAnimalStyle = personaStyle === '동물';
        
        const analysisPrompt = isAnimalStyle 
            ? `다음 한국어 대본을 매우 세밀하게 분석하여 주요 등장인물을 동물 캐릭터로 식별하세요. 

대본의 맥락과 스토리에 완벽하게 맞는 동물 캐릭터를 생성해야 합니다:
1. 대본에서 언급된 등장인물의 역할, 나이, 성격을 정확히 파악
2. 각 등장인물을 적절한 동물로 변환 (성격과 역할에 맞는 동물 선택)
3. 동물의 외모는 그들의 역할과 성격을 반영해야 함
4. 귀엽고 사랑스러운 동물 캐릭터로 설정해주세요

각 등장동물에 대해:
- name: 대본에 나온 이름 또는 역할명 + 동물 종류 (예: "김민준 강아지", "의사 고양이", "학생 토끼" 등)
- description: 대본의 맥락에 맞는 구체적인 동물 외모 묘사 (동물 종류, 털색, 크기, 표정, 특징, 귀여운 요소 포함)

결과를 JSON 배열로 반환하세요: \`[{name: string, description: string}]\`

대본: \n\n${script}`
            : `다음 한국어 대본을 매우 세밀하게 분석하여 주요 등장인물을 식별하세요. 
    
대본의 맥락과 스토리에 완벽하게 맞는 캐릭터를 생성해야 합니다:
1. 대본에서 언급된 등장인물의 역할, 나이, 성격을 정확히 파악
2. 대본의 시대적 배경, 장르, 분위기에 맞는 캐릭터 설정
3. 각 등장인물의 외모는 그들의 역할과 성격을 반영해야 함
4. 한국인의 특징을 가진 인물로 설정해주세요

각 등장인물에 대해:
- name: 대본에 나온 이름 또는 역할명 (예: "김영수", "의사", "학생" 등)
- description: 대본의 맥락에 맞는 구체적인 외모 묘사 (나이대, 복장, 표정, 체형, 헤어스타일, 한국인 특징 포함)

결과를 JSON 배열로 반환하세요: \`[{name: string, description: string}]\`

대본: \n\n${script}`;

    console.log("🔄 Calling Gemini API for character analysis...");
    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ["name", "description"]
                }
            }
        }
    });

    console.log("✅ Character analysis API call completed");
    console.log("📄 Raw response:", analysisResponse.text);
    
    const characterData: RawCharacterData[] = JSON.parse(analysisResponse.text);
    console.log("📋 Parsed character data:", characterData);

    console.log(`Step 2: Generating images for ${characterData.length} characters sequentially...`);
    
    // 순차적으로 이미지 생성하여 rate limit 방지
    const successfulCharacters: Character[] = [];
    const failedErrors: string[] = [];
    
    for (let i = 0; i < characterData.length; i++) {
        const char = characterData[i];
        console.log(`Processing character ${i + 1}/${characterData.length}: ${char.name}`);
        
        try {
            // 각 요청 사이에 2초 지연
            if (i > 0) {
                console.log('Waiting 2 seconds before next request...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // 프롬프트 생성
            let contextualPrompt: string;
            
            if (customPrompt && customPrompt.trim()) {
                // 커스텀 프롬프트가 있는 경우 사용
                contextualPrompt = customPrompt;
            } else {
                // 스타일과 구도 정보 생성
                const styleText = personaStyle === 'custom' && customStyle ? customStyle : personaStyle || '모던';
                const compositionText = getCompositionPrompt(photoComposition || '정면');
                const stylePrompt = getStylePrompt(styleText);
                
                // 동물 스타일인지 확인
                if (personaStyle === '동물') {
                    contextualPrompt = `${compositionText} cute adorable animal character portrait of ${char.name}. ${char.description}. 
                    Kawaii animal character design, extremely cute and lovable, big expressive eyes, soft fur texture, 
                    charming personality visible in expression, child-friendly and heartwarming style. 
                    Professional digital art, vibrant colors, detailed fur patterns, adorable features. 
                    Only one animal character in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
                } else if (imageStyle === 'animation') {
                    contextualPrompt = `${compositionText} anime/animation style character portrait of ${char.name}. ${char.description}. 
                    ${stylePrompt} Korean anime character design, clean anime art style, colorful and vibrant, 
                    detailed anime facial features, appropriate for the character's role and personality described in the script. 
                    Studio-quality anime illustration, professional anime character design. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
                } else {
                    contextualPrompt = `${compositionText} professional portrait photograph of ${char.name}. ${char.description}. 
                    ${stylePrompt} High quality Korean person headshot, natural lighting, neutral background, photorealistic style, 
                    detailed facial features, appropriate for the character's role and personality described in the script. 
                    Focus on realistic Korean facial features, professional photography quality. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
                }
            }
            
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: contextualPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio,
                },
            });

            const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;

            if (!imageBytes) {
                console.warn(`Image generation failed for character: ${char.name}, using fallback`);
                // 실패한 경우 더 간단한 프롬프트로 재시도
                const fallbackPrompt = personaStyle === '동물'
                    ? `Single cute animal character representing ${char.name}. Simple adorable animal design, clean background, kawaii style, no subtitles, no speech bubbles, no text.`
                    : imageStyle === 'animation' 
                        ? `Single person simple anime character of a Korean person representing ${char.name}. Clean anime style, neutral background, no subtitles, no speech bubbles, no text.`
                        : `Single person professional headshot of a Korean person representing ${char.name}. Clean background, neutral expression, photorealistic, no subtitles, no speech bubbles, no text.`;
                    
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 추가 지연
                
                const fallbackResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: fallbackPrompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: aspectRatio,
                    },
                });
                
                const fallbackBytes = fallbackResponse.generatedImages?.[0]?.image?.imageBytes;
                if (!fallbackBytes) {
                    throw new Error(`Both image generation and fallback failed for character: ${char.name}`);
                }
                
                successfulCharacters.push({
                    id: self.crypto.randomUUID(),
                    name: char.name,
                    description: char.description,
                    image: fallbackBytes,
                });
            } else {
                successfulCharacters.push({
                    id: self.crypto.randomUUID(),
                    name: char.name,
                    description: char.description,
                    image: imageBytes,
                });
            }
            
            console.log(`Successfully generated image for ${char.name}`);
        } catch (error) {
            console.error(`Error generating image for ${char.name}:`, error);
            failedErrors.push(`${char.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    if (failedErrors.length > 0) {
        console.warn('Some characters failed to generate:', failedErrors);
        if (successfulCharacters.length === 0) {
            throw new Error('All character generation failed. Please try with different content or check your internet connection.');
        }
    }
    
    console.log("✅ Character generation completed successfully!");
    console.log(`📊 Generated ${successfulCharacters.length} characters`);
    return successfulCharacters;
    
    } catch (error) {
        console.error("❌ Character generation failed:", error);
        
        // 더 구체적인 에러 메시지 제공
        if (error instanceof Error) {
            if (error.message.includes('API_KEY_INVALID') || error.message.includes('Invalid API key')) {
                throw new Error('올바르지 않은 API 키입니다. Google AI Studio에서 새로운 API 키를 생성해주세요.');
            } else if (error.message.includes('PERMISSION_DENIED') || error.message.includes('permission')) {
                throw new Error('API 키 권한이 없습니다. Imagen API가 활성화되어 있는지 확인해주세요.');
            } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
                throw new Error('API 사용량이 초과되었습니다. 잠시 후 다시 시도하거나 요금제를 확인해주세요.');
            } else if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
                throw new Error('너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.');
            }
        }
        
        throw error;
    }
};

export const regenerateCharacterImage = async (
    description: string, 
    name: string, 
    apiKey?: string, 
    imageStyle: 'realistic' | 'animation' = 'realistic',
    aspectRatio: AspectRatio = '16:9',
    personaStyle?: string
): Promise<string> => {
    const ai = getGoogleAI(apiKey);
    console.log(`Regenerating image for ${name}...`);
    
    try {
        // 스타일에 따른 프롬프트 생성
        let imagePrompt: string;
        
        if (personaStyle === '동물') {
            imagePrompt = `Single cute adorable animal character illustration of ${name}. ${description}. 
            Kawaii animal character design, extremely cute and lovable, big expressive eyes, soft fur texture, 
            charming personality visible in expression, child-friendly and heartwarming style. 
            Professional digital art, vibrant colors, detailed fur patterns, adorable features. 
            Only one animal character in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
        } else if (imageStyle === 'animation') {
            imagePrompt = `Single person high quality anime/animation style character illustration of ${name}. ${description}. 
            Korean anime character design, clean anime art style, colorful and vibrant, 
            detailed anime facial features. Studio-quality anime illustration. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
        } else {
            imagePrompt = `Single person professional portrait photograph of ${name}. ${description}. 
            High quality Korean person headshot, natural lighting, neutral background, photorealistic style, 
            detailed facial features. Professional photography quality. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
        }

        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });

        const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) {
            // 실패한 경우 더 간단한 프롬프트로 재시도
            console.warn(`Initial regeneration failed for ${name}, trying with simpler prompt...`);
            
            const fallbackPrompt = personaStyle === '동물'
                ? `A single cute animal character. Simple adorable design, clean background, kawaii style, no subtitles, no speech bubbles, no text.`
                : `A single person simple professional portrait of a friendly person. Clean style, neutral background, no subtitles, no speech bubbles, no text.`;
            
            const fallbackResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fallbackPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio,
                },
            });
            
            const fallbackBytes = fallbackResponse.generatedImages?.[0]?.image?.imageBytes;
            if (!fallbackBytes) {
                throw new Error(`Image regeneration failed for character: ${name}. Please try with a different description.`);
            }
            
            return fallbackBytes;
        }

        return imageBytes;
    } catch (error) {
        console.error(`Error regenerating image for ${name}:`, error);
        throw new Error(`Image regeneration failed for character: ${name}. This might be due to content policy restrictions. Please try with a different character description.`);
    }
};


// 시퀀스별 내용인지 확인하는 함수
const isSequenceFormat = (script: string): boolean => {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let sequenceCount = 0;
    
    for (const line of lines) {
        // 숫자로 시작하는 패턴 (1. 2. 3. 등) 또는 번호 패턴 체크
        if (/^\d+[\.\)]\s/.test(line) || /^\d+\s*[-:]\s/.test(line)) {
            sequenceCount++;
        }
    }
    
    // 전체 줄의 50% 이상이 번호 패턴을 가지면 시퀀스 형식으로 판단
    return sequenceCount >= lines.length * 0.5 && sequenceCount >= 2;
};

// 시퀀스에서 장면 설명 추출하는 함수
const extractSequenceDescriptions = (script: string): string[] => {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const scenes: string[] = [];
    
    for (const line of lines) {
        // 번호 패턴 제거하고 순수 장면 설명만 추출
        const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').replace(/^\d+\s*[-:]\s*/, '').trim();
        if (cleanLine.length > 0) {
            scenes.push(cleanLine);
        }
    }
    
    return scenes;
};

export const generateStoryboard = async (
    script: string, 
    characters: Character[], 
    imageCount: number, 
    apiKey?: string, 
    imageStyle: 'realistic' | 'animation' = 'realistic',
    subtitleEnabled: boolean = true,
    referenceImage?: string | null,
    aspectRatio: AspectRatio = '16:9'
): Promise<{id: string, image: string, sceneDescription: string}[]> => {
    const ai = getGoogleAI(apiKey);
    
    let sceneDescriptions: string[];
    
    // 시퀀스 형식인지 확인
    if (isSequenceFormat(script)) {
        console.log("Step 1: Processing sequence-based input...");
        sceneDescriptions = extractSequenceDescriptions(script);
        console.log(`Found ${sceneDescriptions.length} sequence descriptions:`, sceneDescriptions);
        
        // 요청된 이미지 수만큼 조정
        if (sceneDescriptions.length > imageCount) {
            sceneDescriptions = sceneDescriptions.slice(0, imageCount);
        } else if (sceneDescriptions.length < imageCount) {
            // 시퀀스가 적으면 그 수만큼만 생성
            console.log(`Adjusting image count from ${imageCount} to ${sceneDescriptions.length} based on sequences`);
        }
    } else {
        console.log("Step 1: Generating scene descriptions from script...");
        const scenesPrompt = `다음 한국어 대본을 분석하세요. ${imageCount}개의 주요 시각적 장면으로 나누세요. 각 장면에 대해 이미지 생성 프롬프트로 사용할 수 있는 짧고 설명적인 캡션을 한국어로 제공하세요. 결과를 문자열의 JSON 배열로 반환하세요: \`["장면 1 설명", "장면 2 설명", ...]\`. 대본: \n\n${script}`;
        
        const scenesResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: scenesPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        sceneDescriptions = JSON.parse(scenesResponse.text);
    }

    console.log(`Step 2: Generating ${sceneDescriptions.length} storyboard images sequentially...`);

    const storyboardResults: any[] = [];
    
    for (let i = 0; i < sceneDescriptions.length; i++) {
        const scene = sceneDescriptions[i];
        console.log(`Processing scene ${i + 1}/${sceneDescriptions.length}: ${scene.substring(0, 50)}...`);
        
        try {
            // 각 요청 사이에 3초 지연 (영상 소스는 더 복잡하므로)
            if (i > 0) {
                console.log('Waiting 3 seconds before next scene generation...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            const parts: any[] = [];
            
            // 참조 이미지가 있는 경우 추가
            if (referenceImage) {
                parts.push({
                    inlineData: {
                        data: referenceImage,
                        mimeType: 'image/jpeg'
                    }
                });
                parts.push({ text: 'Style reference image - please maintain consistency with this visual style' });
            }
            
            characters.forEach(char => {
                parts.push({
                    inlineData: {
                        data: char.image,
                        mimeType: 'image/jpeg' 
                    }
                });
                parts.push({ text: `Reference image for character: ${char.name}` });
            });

            // 스타일에 따른 이미지 생성 프롬프트
            let imageGenPrompt: string;
            const subtitleText = subtitleEnabled ? '한국어 자막을 포함하여' : '자막 없이';
            const referenceText = referenceImage ? ' 제공된 스타일 참조 이미지의 시각적 일관성을 유지하면서' : '';
            
            if (imageStyle === 'animation') {
                imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여${referenceText} 이 장면에 대한 애니메이션 스타일 이미지를 ${subtitleText} 만드세요: "${scene}". 
                장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 
                애니메이션/만화 스타일로 그려주세요. 밝고 컬러풀한 애니메이션 아트 스타일, ${aspectRatio} 비율로 이미지를 생성하고, 
                주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${subtitleEnabled ? ' 화면 하단에 한국어 자막을 자연스럽게 배치해주세요.' : ''}`;
            } else {
                imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여${referenceText} 이 장면에 대한 사실적인 이미지를 ${subtitleText} 만드세요: "${scene}". 
                장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 
                실사 영화 스타일, 시네마틱 ${aspectRatio} 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${subtitleEnabled ? ' 화면 하단에 한국어 자막을 자연스럽게 배치해주세요.' : ''}`;
            }
            parts.push({ text: imageGenPrompt });

            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                // FIX: Removed unsupported `temperature` config for the image editing model.
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                }
            });

            const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (!imagePart?.inlineData?.data) {
                console.warn(`Image generation might have failed for scene: ${scene}`);
                storyboardResults.push({ id: self.crypto.randomUUID(), image: '', sceneDescription: scene });
            } else {
                storyboardResults.push({
                    id: self.crypto.randomUUID(),
                    image: imagePart.inlineData.data,
                    sceneDescription: scene,
                });
                console.log(`Successfully generated image for scene ${i + 1}`);
            }
        } catch (error) {
            console.error(`Error generating scene ${i + 1}:`, error);
            storyboardResults.push({ id: self.crypto.randomUUID(), image: '', sceneDescription: scene });
        }
    }

    return storyboardResults;
};

export const regenerateStoryboardImage = async (
    sceneDescription: string, 
    characters: Character[], 
    apiKey?: string,
    imageStyle: 'realistic' | 'animation' = 'realistic',
    subtitleEnabled: boolean = true,
    referenceImage?: string | null,
    aspectRatio: AspectRatio = '16:9'
): Promise<string> => {
    const ai = getGoogleAI(apiKey);
    console.log(`Regenerating image for scene: ${sceneDescription}`);
    
    const parts: any[] = [];
    
    // 참조 이미지가 있는 경우 추가
    if (referenceImage) {
        parts.push({
            inlineData: {
                data: referenceImage,
                mimeType: 'image/jpeg'
            }
        });
        parts.push({ text: 'Style reference image - please maintain consistency with this visual style' });
    }
    
    characters.forEach(char => {
        parts.push({ inlineData: { data: char.image, mimeType: 'image/jpeg' } });
        parts.push({ text: `Reference image for character: ${char.name}` });
    });

    // 스타일에 따른 이미지 생성 프롬프트
    let imageGenPrompt: string;
    const subtitleText = subtitleEnabled ? '한국어 자막을 포함하여' : '자막 없이';
    const referenceText = referenceImage ? ' 제공된 스타일 참조 이미지의 시각적 일관성을 유지하면서' : '';
    
    if (imageStyle === 'animation') {
        imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여${referenceText} 이 장면에 대한 애니메이션 스타일 이미지를 ${subtitleText} 만드세요: "${sceneDescription}". 
        장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 
        애니메이션/만화 스타일로 그려주세요. 밝고 컬러풀한 애니메이션 아트 스타일, ${aspectRatio} 비율로 이미지를 생성하고, 
        주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${subtitleEnabled ? ' 화면 하단에 한국어 자막을 자연스럽게 배치해주세요.' : ''}`;
    } else {
        imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여${referenceText} 이 장면에 대한 상세한 이미지를 ${subtitleText} 만드세요: "${sceneDescription}". 
        장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 
        시네마틱 ${aspectRatio} 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${subtitleEnabled ? ' 화면 하단에 한국어 자막을 자연스럽게 배치해주세요.' : ''}`;
    }
    parts.push({ text: imageGenPrompt });

    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        // FIX: Removed unsupported `temperature` config for the image editing model.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (!imagePart?.inlineData?.data) {
        throw new Error(`Image regeneration failed for scene: ${sceneDescription}`);
    }

    return imagePart.inlineData.data;
};