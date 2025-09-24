import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { RawCharacterData, Character } from '../types';

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

const extractJson = (text: string): any => {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            console.error("Failed to parse JSON from markdown", e);
            throw new Error("Invalid JSON format returned from API.");
        }
    }
    // Fallback for raw JSON string
    try {
        return JSON.parse(text);
    } catch (e) {
         console.error("Failed to parse raw JSON string", e);
         throw new Error("Could not find or parse JSON in the response.");
    }
};

export const generateCharacters = async (script: string, apiKey?: string): Promise<Character[]> => {
    const ai = getGoogleAI(apiKey);
    console.log("Step 1: Analyzing script for characters...");
    const analysisPrompt = `다음 한국어 대본을 분석하세요. 주요 등장인물을 식별하세요. 각 등장인물에 대해 이미지 생성을 위한 'name'과 상세한 'description'(신체적 외모, 의상, 스타일)을 제공하세요. 결과를 JSON 배열로 반환하세요: \`[{name: string, description: string}]\`. 대본: \n\n${script}`;

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

    const characterData: RawCharacterData[] = JSON.parse(analysisResponse.text);

    console.log(`Step 2: Generating images for ${characterData.length} characters...`);
    const characterPromises = characterData.map(async (char) => {
        // FIX: Use `generateImages` with the 'imagen-4.0-generate-001' model for image generation.
        const imagePrompt = `A photorealistic character portrait of ${char.name}. ${char.description}. Centered, high-quality, cinematic lighting, neutral background.`;
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;

        if (!imageBytes) {
            throw new Error(`Image generation failed for character: ${char.name}`);
        }

        return {
            id: self.crypto.randomUUID(),
            name: char.name,
            description: char.description,
            image: imageBytes,
        };
    });

    return Promise.all(characterPromises);
};

export const regenerateCharacterImage = async (description: string, name: string, apiKey?: string): Promise<string> => {
    const ai = getGoogleAI(apiKey);
    console.log(`Regenerating image for ${name}...`);
    // FIX: Use `generateImages` with the 'imagen-4.0-generate-001' model for image generation.
    const imagePrompt = `A photorealistic character portrait of ${name}. ${description}. Centered, high-quality, cinematic lighting, neutral background.`;

    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });

    const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
        throw new Error(`Image regeneration failed for character: ${name}`);
    }

    return imageBytes;
};


export const generateStoryboard = async (script: string, characters: Character[], imageCount: number, apiKey?: string): Promise<{id: string, image: string, sceneDescription: string}[]> => {
    const ai = getGoogleAI(apiKey);
    console.log("Step 1: Generating scene descriptions...");
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

    const sceneDescriptions: string[] = JSON.parse(scenesResponse.text);

    console.log(`Step 2: Generating ${sceneDescriptions.length} storyboard images...`);

    const storyboardPromises = sceneDescriptions.map(async (scene) => {
        const parts: any[] = [];
        
        characters.forEach(char => {
            parts.push({
                inlineData: {
                    data: char.image,
                    mimeType: 'image/jpeg' 
                }
            });
            parts.push({ text: `Reference image for character: ${char.name}` });
        });

        const imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여 이 장면에 대한 상세한 이미지를 만드세요: "${scene}". 장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 시네마틱 16:9 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.`;
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
            return { id: self.crypto.randomUUID(), image: '', sceneDescription: scene }; // Return empty image on failure
        }

        return {
            id: self.crypto.randomUUID(),
            image: imagePart.inlineData.data,
            sceneDescription: scene,
        };
    });

    return Promise.all(storyboardPromises);
};

export const regenerateStoryboardImage = async (sceneDescription: string, characters: Character[], apiKey?: string): Promise<string> => {
    const ai = getGoogleAI(apiKey);
    console.log(`Regenerating image for scene: ${sceneDescription}`);
    
    const parts: any[] = [];
    characters.forEach(char => {
        parts.push({ inlineData: { data: char.image, mimeType: 'image/jpeg' } });
        parts.push({ text: `Reference image for character: ${char.name}` });
    });

    const imageGenPrompt = `제공된 참조 캐릭터 이미지를 사용하여 이 장면에 대한 상세한 이미지를 만드세요: "${sceneDescription}". 장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요. 시네마틱 16:9 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.`;
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