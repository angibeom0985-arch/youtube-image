import {
  GoogleGenAI,
  Type,
  Modality,
  GenerateContentResponse,
} from "@google/genai";
import {
  RawCharacterData,
  Character,
  AspectRatio,
  ImageStyle,
  PhotoComposition,
  CameraAngle,
  CameraAngleImage,
} from "../types";
import { replaceUnsafeWords } from "../utils/contentSafety";

// 디버그 모드 설정 (개발 환경에서만 로그 출력)
const DEBUG_MODE = process.env.NODE_ENV !== "production";
const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Exponential backoff를 사용한 재시도 함수
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const errorMessage = error?.message || String(error);
      
      // Rate limit 또는 일시적 에러인 경우에만 재시도
      const isRetryableError =
        errorMessage.includes("RATE_LIMIT") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("QUOTA_EXCEEDED") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("DEADLINE_EXCEEDED") ||
        errorMessage.includes("503") ||
        errorMessage.includes("429");

      if (!isRetryableError || isLastAttempt) {
        throw error;
      }

      // Exponential backoff 계산
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // 0-1초의 랜덤 지연 추가
      const totalDelay = delay + jitter;

      console.log(
        `⏳ Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${Math.round(totalDelay / 1000)}s... Error: ${errorMessage}`
      );
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }
  throw new Error("Max retries exceeded");
};

// 환경 변수에서 API 키를 가져오거나, 런타임에서 동적으로 설정
const getGoogleAI = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "API 키가 설정되지 않았습니다. Google AI Studio에서 API 키를 발급받아 입력해주세요."
    );
  }
  return new GoogleGenAI({ apiKey: key });
};

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
};

const extractJson = <T = unknown>(text: string): T => {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]) as T;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      console.error("Failed to parse JSON from markdown:", errorMsg);
      throw new Error(`Invalid JSON format returned from API: ${errorMsg}`);
    }
  }
  // Fallback for raw JSON string
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("Failed to parse raw JSON string:", errorMsg);
    throw new Error(
      `Could not find or parse JSON in the response: ${errorMsg}`
    );
  }
};

// 스타일 프롬프트 생성 함수
const getStylePrompt = (style: string): string => {
  const styleMap: Record<string, string> = {
    "감성 멜로":
      "romantic and emotional atmosphere, soft warm lighting, dreamy mood, tender expressions",
    서부극:
      "western film style, classic cowboy aesthetic, desert landscape, adventurous atmosphere",
    "공포 스릴러":
      "mysterious cinematic atmosphere, dramatic lighting, intriguing suspenseful mood, artistic shadows",
    "1980년대":
      "South Korean 1980s retro style, vintage city street, traditional Korean architecture mixed with modernizing elements, people in 80s fashion, warm nostalgic tones, film grain",
    "2000년대":
      "South Korean 2000s Y2K aesthetic, early 2000s Seoul city street, flip phones, MP3 players, fashion trends of the era, vibrant but slightly muted colors, a mix of digital and analog feel",
    사이버펑크:
      "futuristic cyberpunk style, vibrant neon lights, advanced technology, modern urban environment",
    판타지:
      "fantasy adventure style, magical enchanted atmosphere, mystical fantasy setting, imaginative world",
    미니멀:
      "minimalist modern style, clean simple composition, elegant neutral tones, refined aesthetic",
    빈티지:
      "vintage classic style, timeless aesthetic, nostalgic retro mood, aged film quality",
    모던: "modern contemporary style, sleek urban aesthetic, sophisticated clean look, current trends",
    동물: "cute friendly animal characters, adorable lovable pets, charming wildlife, wholesome animal atmosphere",
    "실사 극대화":
      "ultra-realistic style, professional photographic quality, highly detailed imagery, cinematic photography",
    애니메이션:
      "animated cartoon style, vibrant cheerful colors, anime illustration aesthetic, stylized character design",
    먹방: "Food photography with a person eating deliciously, close-up, expressive eating, vibrant colors, appetizing, high-quality, professional food styling, focus on the joy of eating",
    귀여움:
      "Cute and charming illustration, soft pastel colors, lovely character design, heartwarming, adorable aesthetic",
    AI: "Artificial intelligence concept art, futuristic, glowing circuitry, abstract digital patterns, sleek and sophisticated, advanced technology theme",
    괴이함:
      "Surreal and bizarre art, uncanny atmosphere, dreamlike, abstract and distorted elements, strange and intriguing, dark fantasy",
    창의적인:
      "Creative and imaginative artwork, unique concept, innovative composition, vibrant and expressive, artistic and original",
  };

  return styleMap[style] || style;
};

// 구도 프롬프트 생성 함수
const getCompositionPrompt = (composition: PhotoComposition): string => {
  const compositionMap: Record<PhotoComposition, string> = {
    정면: "Front view, facing camera directly",
    측면: "Side view, profile shot",
    반측면: "Three-quarter view, slightly turned",
    위에서: "High angle shot, view from above",
    아래에서: "Low angle shot, view from below",
    전신: "Full body shot, entire person visible",
    상반신: "Upper body shot, waist up portrait",
    클로즈업: "Close-up headshot, detailed facial features",
  };

  return compositionMap[composition];
};

export const generateCharacters = async (
  script: string,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  aspectRatio: AspectRatio = "16:9",
  personaStyle?: ImageStyle,
  customStyle?: string,
  photoComposition?: PhotoComposition,
  customPrompt?: string,
  characterStyle?: string,
  backgroundStyle?: string,
  customCharacterStyle?: string,
  customBackgroundStyle?: string,
  personaReferenceImage?: string | null,
  onProgress?: (message: string) => void
): Promise<Character[]> => {
  try {
    const ai = getGoogleAI(apiKey);

    debugLog("🚀 Starting character generation process");

    // 동물 스타일인지 확인
    const isAnimalStyle = personaStyle === "동물";

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
    onProgress?.("대본 분석 중...");
    
    const analysisResponse = await retryWithBackoff(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: analysisPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["name", "description"],
              },
            },
          },
        }),
      3,
      2000
    );

    console.log("✅ Character analysis API call completed");
    console.log("📄 Raw response:", analysisResponse.text);

    const characterData: RawCharacterData[] = JSON.parse(analysisResponse.text);
    console.log("📋 Parsed character data:", characterData);

    console.log(
      `Step 2: Generating images for ${characterData.length} characters sequentially...`
    );
    onProgress?.(`${characterData.length}개 캐릭터 이미지 생성 준비 중...`);

    // 순차적으로 이미지 생성하여 rate limit 방지
    const successfulCharacters: Character[] = [];
    const failedErrors: string[] = [];

    for (let i = 0; i < characterData.length; i++) {
      const char = characterData[i];
      console.log(
        `Processing character ${i + 1}/${characterData.length}: ${char.name}`
      );
      onProgress?.(`캐릭터 ${i + 1}/${characterData.length} 생성 중: ${char.name}`);

      try {
        // 각 요청 사이에 3-4초 지연 (rate limit 방지 강화)
        if (i > 0) {
          const delay = 3000 + Math.random() * 1000; // 3-4초 랜덤 지연
          console.log(`Waiting ${Math.round(delay / 1000)}s before next request...`);
          onProgress?.(`다음 캐릭터 생성 전 대기 중... (${Math.round(delay / 1000)}초)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // 프롬프트 생성
        let contextualPrompt: string;

        // 참조 이미지가 있는지 확인
        const hasPersonaReference =
          personaReferenceImage !== null && personaReferenceImage !== undefined;
        const referenceStyleNote = hasPersonaReference
          ? "Please maintain consistency with the style reference image provided. "
          : "";

        if (customPrompt && customPrompt.trim()) {
          // 커스텀 프롬프트가 있는 경우 사용 (참조 이미지 안내 추가)
          contextualPrompt = referenceStyleNote + customPrompt;
        } else {
          // 인물 스타일 결정
          const finalCharacterStyle =
            characterStyle === "custom" && customCharacterStyle
              ? customCharacterStyle
              : characterStyle || "실사 극대화";

          // 배경 스타일 결정
          const finalBackgroundStyle =
            backgroundStyle === "custom" && customBackgroundStyle
              ? customBackgroundStyle
              : backgroundStyle || "모던";

          // 구도 정보 생성
          const compositionText = getCompositionPrompt(
            photoComposition || "정면"
          );

          // 배경 스타일 프롬프트 생성
          const backgroundPrompt = getStylePrompt(finalBackgroundStyle);

          // 인물 스타일에 따른 프롬프트 생성
          if (finalCharacterStyle === "동물") {
            contextualPrompt = `${referenceStyleNote}${compositionText} cute adorable animal character portrait of ${char.name}. ${char.description}. 
                    ${backgroundPrompt} Kawaii animal character design, extremely cute and lovable, big expressive eyes, soft fur texture, 
                    charming personality visible in expression, child-friendly and heartwarming style. 
                    Professional digital art, vibrant colors, detailed fur patterns, adorable features. 
                    Only one animal character in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
          } else if (finalCharacterStyle === "애니메이션") {
            contextualPrompt = `${referenceStyleNote}${compositionText} anime/animation style character portrait of ${char.name}. ${char.description}. 
                    ${backgroundPrompt} Korean anime character design, clean anime art style, colorful and vibrant, 
                    detailed anime facial features, appropriate for the character's role and personality described in the script. 
                    Studio-quality anime illustration, professional anime character design. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
          } else if (finalCharacterStyle === "1980년대") {
            contextualPrompt = `${referenceStyleNote}${compositionText} professional portrait of ${char.name} with 1980s style. ${char.description}. 
                    ${backgroundPrompt} 1980s retro fashion, vintage 80s hairstyle, retro aesthetic, period-accurate clothing and accessories. 
                    High quality portrait, natural lighting, photorealistic style, detailed facial features. 
                    Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
          } else if (finalCharacterStyle === "2000년대") {
            contextualPrompt = `${referenceStyleNote}${compositionText} professional portrait of ${char.name} with 2000s Y2K style. ${char.description}. 
                    ${backgroundPrompt} Early 2000s fashion trends, Y2K aesthetic, millennium era style, period-accurate clothing. 
                    High quality portrait, natural lighting, photorealistic style, detailed facial features. 
                    Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
          } else {
            // 실사 극대화 또는 커스텀
            const characterStylePrompt =
              finalCharacterStyle === "실사 극대화"
                ? "ultra-realistic, photographic quality, highly detailed, professional photography"
                : finalCharacterStyle;

            contextualPrompt = `${referenceStyleNote}${compositionText} professional portrait photograph of ${char.name}. ${char.description}. 
                    ${backgroundPrompt} ${characterStylePrompt} High quality Korean person headshot, natural lighting, 
                    detailed facial features, appropriate for the character's role and personality described in the script. 
                    Focus on realistic Korean facial features, professional photography quality. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
          }
        }

        let imageResponse;
        let finalPrompt = contextualPrompt;
        let contentPolicyRetry = false;
        let replacementInfo: Array<{ original: string; replacement: string }> =
          [];

        try {
          // 1단계: 원래 프롬프트로 시도 (재시도 로직 포함)
          imageResponse = await retryWithBackoff(
            () =>
              ai.models.generateImages({
                model: "imagen-4.0-generate-001",
                prompt: contextualPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: "image/jpeg",
                  aspectRatio: aspectRatio,
                },
              }),
            3,
            2000
          );
        } catch (firstError: any) {
          // 콘텐츠 정책 위반 감지
          const errorMessage = firstError?.message || String(firstError);
          const isSafetyError =
            errorMessage.includes("SAFETY") ||
            errorMessage.includes("BLOCK") ||
            errorMessage.includes("content policy") ||
            errorMessage.includes("harmful content") ||
            errorMessage.includes("콘텐츠 정책");

          if (isSafetyError) {
            console.warn(
              `⚠️ Content policy violation detected for ${char.name}, attempting with safe words...`
            );
            contentPolicyRetry = true;

            // 2단계: 안전한 단어로 교체하여 재시도
            const originalDescription = char.description;
            const { replacedText, replacements } =
              replaceUnsafeWords(originalDescription);
            replacementInfo = replacements;

            if (replacements.length > 0) {
              console.log(
                `🔄 Replacing words: ${replacements
                  .map((r) => `"${r.original}" → "${r.replacement}"`)
                  .join(", ")}`
              );

              // 교체된 설명으로 새 프롬프트 생성
              let safePrompt = contextualPrompt.replace(
                char.description,
                replacedText
              );

              // 프롬프트 전체에서도 위험 단어 교체
              const { replacedText: fullyReplacedPrompt } =
                replaceUnsafeWords(safePrompt);
              finalPrompt = fullyReplacedPrompt;

              await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 지연

              imageResponse = await retryWithBackoff(
                () =>
                  ai.models.generateImages({
                    model: "imagen-4.0-generate-001",
                    prompt: finalPrompt,
                    config: {
                      numberOfImages: 1,
                      outputMimeType: "image/jpeg",
                      aspectRatio: aspectRatio,
                    },
                  }),
                3,
                2000
              );
            } else {
              throw firstError; // 교체할 단어가 없으면 원래 에러 발생
            }
          } else {
            throw firstError; // 콘텐츠 정책 외 에러는 그대로 발생
          }
        }

        const imageBytes =
          imageResponse?.generatedImages?.[0]?.image?.imageBytes;

        if (!imageBytes) {
          console.warn(
            `Image generation failed for character: ${char.name}, using fallback`
          );
          // 실패한 경우 더 간단한 프롬프트로 재시도
          const fallbackPrompt =
            personaStyle === "동물"
              ? `Single cute animal character representing ${char.name}. Simple adorable animal design, clean background, kawaii style, no subtitles, no speech bubbles, no text.`
              : imageStyle === "animation"
              ? `Single person simple anime character of a Korean person representing ${char.name}. Clean anime style, neutral background, no subtitles, no speech bubbles, no text.`
              : `Single person professional headshot of a Korean person representing ${char.name}. Clean background, neutral expression, photorealistic, no subtitles, no speech bubbles, no text.`;

          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 추가 지연

          const fallbackResponse = await retryWithBackoff(
            () =>
              ai.models.generateImages({
                model: "imagen-4.0-generate-001",
                prompt: fallbackPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: "image/jpeg",
                  aspectRatio: aspectRatio,
                },
              }),
            2,
            2000
          );

          const fallbackBytes =
            fallbackResponse.generatedImages?.[0]?.image?.imageBytes;
          if (!fallbackBytes) {
            throw new Error(
              `Both image generation and fallback failed for character: ${char.name}`
            );
          }

          successfulCharacters.push({
            id: self.crypto.randomUUID(),
            name: char.name,
            description: char.description,
            image: fallbackBytes,
          });
        } else {
          const character: Character = {
            id: self.crypto.randomUUID(),
            name: char.name,
            description: char.description,
            image: imageBytes,
          };

          // 콘텐츠 정책 재시도로 생성된 경우 설명에 알림 추가
          if (contentPolicyRetry && replacementInfo.length > 0) {
            const replacementText = replacementInfo
              .map((r) => `"${r.original}"을(를) "${r.replacement}"(으)로`)
              .join(", ");
            character.description = `${char.description}\n\n⚠️ 알림: 콘텐츠 정책 준수를 위해 ${replacementText} 교체하여 생성되었습니다.`;
            console.log(
              `✅ Successfully generated with word replacement for ${char.name}`
            );
          }

          successfulCharacters.push(character);
        }

        console.log(`Successfully generated image for ${char.name}`);
      } catch (error) {
        console.error(`Error generating image for ${char.name}:`, error);
        
        // 에러 원인 분석
        let errorDetail = "Unknown error";
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("safety") || msg.includes("block") || msg.includes("policy")) {
            errorDetail = "콘텐츠 정책 위반 (설명에 부적절한 단어 포함)";
          } else if (msg.includes("quota") || msg.includes("limit")) {
            errorDetail = "API 사용량 초과";
          } else if (msg.includes("network") || msg.includes("fetch")) {
            errorDetail = "네트워크 연결 오류";
          } else if (msg.includes("timeout")) {
            errorDetail = "요청 시간 초과";
          } else {
            errorDetail = error.message;
          }
        }
        
        failedErrors.push(`${char.name}: ${errorDetail}`);
      }
    }

    if (failedErrors.length > 0) {
      console.warn("Some characters failed to generate:", failedErrors);
      if (successfulCharacters.length === 0) {
        // 실패 원인별로 분류
        const policyErrors = failedErrors.filter(e => e.includes("정책"));
        const quotaErrors = failedErrors.filter(e => e.includes("사용량"));
        const networkErrors = failedErrors.filter(e => e.includes("네트워크"));
        
        let errorMessage = "❌ 모든 캐릭터 생성이 실패했습니다.\n\n";
        
        if (policyErrors.length > 0) {
          errorMessage += "📋 콘텐츠 정책 위반 캐릭터:\n";
          errorMessage += policyErrors.map(e => `  • ${e}`).join("\n");
          errorMessage += "\n\n💡 해결 방법:\n";
          errorMessage += "  1. 캐릭터 설명에서 폭력적, 선정적 표현 제거\n";
          errorMessage += "  2. 중립적이고 긍정적인 표현으로 변경\n";
          errorMessage += "  3. 구체적인 신체 묘사 대신 성격이나 역할 중심으로 작성\n\n";
        }
        
        if (quotaErrors.length > 0) {
          errorMessage += "📊 API 사용량 초과 캐릭터:\n";
          errorMessage += quotaErrors.map(e => `  • ${e}`).join("\n");
          errorMessage += "\n\n💡 해결 방법:\n";
          errorMessage += "  1. 5-10분 후 다시 시도\n";
          errorMessage += "  2. 캐릭터 수를 1-3개로 줄여서 시도\n";
          errorMessage += "  3. Google Cloud Console에서 할당량 확인\n\n";
        }
        
        if (networkErrors.length > 0) {
          errorMessage += "🌐 네트워크 오류 캐릭터:\n";
          errorMessage += networkErrors.map(e => `  • ${e}`).join("\n");
          errorMessage += "\n\n💡 해결 방법:\n";
          errorMessage += "  1. 인터넷 연결 상태 확인\n";
          errorMessage += "  2. 방화벽/보안 프로그램 확인\n";
          errorMessage += "  3. 다른 네트워크로 변경 후 재시도\n\n";
        }
        
        const otherErrors = failedErrors.filter(
          e => !e.includes("정책") && !e.includes("사용량") && !e.includes("네트워크")
        );
        if (otherErrors.length > 0) {
          errorMessage += "⚠️ 기타 오류:\n";
          errorMessage += otherErrors.map(e => `  • ${e}`).join("\n");
          errorMessage += "\n";
        }
        
        throw new Error(errorMessage);
      } else {
        // 일부만 성공한 경우 경고 메시지 추가
        console.warn(
          `⚠️ ${successfulCharacters.length}/${characterData.length} characters generated successfully. Failed: ${failedErrors.length}`
        );
      }
    }

    console.log("✅ Character generation completed successfully!");
    console.log(`📊 Generated ${successfulCharacters.length} characters`);
    return successfulCharacters;
  } catch (error) {
    console.error("❌ Character generation failed:", error);

    // 더 구체적인 에러 메시지 제공
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      if (
        errorMsg.includes("API_KEY_INVALID") ||
        errorMsg.includes("Invalid API key")
      ) {
        throw new Error(
          "❌ 올바르지 않은 API 키입니다.\n\n해결 방법:\n1. Google AI Studio(aistudio.google.com)에서 새로운 API 키를 생성해주세요.\n2. API 키를 정확히 복사했는지 확인해주세요."
        );
      } else if (
        errorMsg.includes("PERMISSION_DENIED") ||
        errorMsg.includes("permission")
      ) {
        throw new Error(
          "❌ API 키 권한이 없습니다.\n\n해결 방법:\n1. Google AI Studio에서 Imagen API를 활성화해주세요.\n2. 새로운 API 키를 발급받아주세요."
        );
      } else if (
        errorMsg.includes("QUOTA_EXCEEDED") ||
        errorMsg.includes("quota")
      ) {
        throw new Error(
          "❌ API 사용량 한도가 초과되었습니다.\n\n해결 방법:\n1. 5-10분 후 다시 시도해주세요.\n2. Google Cloud Console에서 할당량을 확인해주세요.\n3. 필요시 요금제를 업그레이드해주세요."
        );
      } else if (
        errorMsg.includes("RATE_LIMIT_EXCEEDED") ||
        errorMsg.includes("RATE_LIMIT") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("429")
      ) {
        throw new Error(
          "❌ 너무 많은 요청을 보냈습니다.\n\n해결 방법:\n1. 5분 정도 기다린 후 다시 시도해주세요.\n2. 캐릭터 수를 줄여서 시도해보세요.\n3. 한 번에 하나씩 생성해보세요."
        );
      } else if (
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("UNAVAILABLE") ||
        errorMsg.includes("503")
      ) {
        throw new Error(
          "❌ API 서버가 일시적으로 사용 불가능합니다.\n\n해결 방법:\n1. 3-5분 후 다시 시도해주세요.\n2. 서버가 과부하 상태일 수 있습니다."
        );
      }
    }

    throw error;
  }
};

export const regenerateCharacterImage = async (
  description: string,
  name: string,
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  aspectRatio: AspectRatio = "16:9",
  personaStyle?: string
): Promise<string> => {
  const ai = getGoogleAI(apiKey);
  console.log(`Regenerating image for ${name}...`);

  try {
    // 스타일에 따른 프롬프트 생성
    let imagePrompt: string;

    if (personaStyle === "동물") {
      imagePrompt = `Single cute adorable animal character illustration of ${name}. ${description}. 
            Kawaii animal character design, extremely cute and lovable, big expressive eyes, soft fur texture, 
            charming personality visible in expression, child-friendly and heartwarming style. 
            Professional digital art, vibrant colors, detailed fur patterns, adorable features. 
            Only one animal character in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
    } else if (imageStyle === "animation") {
      imagePrompt = `Single person high quality anime/animation style character illustration of ${name}. ${description}. 
            Korean anime character design, clean anime art style, colorful and vibrant, 
            detailed anime facial features. Studio-quality anime illustration. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
    } else {
      imagePrompt = `Single person professional portrait photograph of ${name}. ${description}. 
            High quality Korean person headshot, natural lighting, neutral background, photorealistic style, 
            detailed facial features. Professional photography quality. Only one person in the image, no subtitles, no speech bubbles, no text, no dialogue.`;
    }

    const imageResponse = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: aspectRatio,
      },
    });

    const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
      // 실패한 경우 더 간단한 프롬프트로 재시도
      console.warn(
        `Initial regeneration failed for ${name}, trying with simpler prompt...`
      );

      const fallbackPrompt =
        personaStyle === "동물"
          ? `A single cute animal character. Simple adorable design, clean background, kawaii style, no subtitles, no speech bubbles, no text.`
          : `A single person simple professional portrait of a friendly person. Clean style, neutral background, no subtitles, no speech bubbles, no text.`;

      const fallbackResponse = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: fallbackPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: aspectRatio,
        },
      });

      const fallbackBytes =
        fallbackResponse.generatedImages?.[0]?.image?.imageBytes;
      if (!fallbackBytes) {
        throw new Error(
          `Image regeneration failed for character: ${name}. Please try with a different description.`
        );
      }

      return fallbackBytes;
    }

    return imageBytes;
  } catch (error) {
    console.error(`Error regenerating image for ${name}:`, error);
    throw new Error(
      `Image regeneration failed for character: ${name}. This might be due to content policy restrictions. Please try with a different character description.`
    );
  }
};

// 시퀀스별 내용인지 확인하는 함수
const isSequenceFormat = (script: string): boolean => {
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const scenes: string[] = [];

  for (const line of lines) {
    // 번호 패턴 제거하고 순수 장면 설명만 추출
    const cleanLine = line
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^\d+\s*[-:]\s*/, "")
      .trim();
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
  imageStyle: "realistic" | "animation" = "realistic",
  subtitleEnabled: boolean = true,
  referenceImage?: string | null,
  aspectRatio: AspectRatio = "16:9",
  onProgress?: (message: string) => void
): Promise<{ id: string; image: string; sceneDescription: string }[]> => {
  const ai = getGoogleAI(apiKey);

  let sceneDescriptions: string[];

  // 시퀀스 형식인지 확인
  if (isSequenceFormat(script)) {
    console.log("Step 1: Processing sequence-based input...");
    sceneDescriptions = extractSequenceDescriptions(script);
    console.log(
      `Found ${sceneDescriptions.length} sequence descriptions:`,
      sceneDescriptions
    );

    // 요청된 이미지 수만큼 조정
    if (sceneDescriptions.length > imageCount) {
      sceneDescriptions = sceneDescriptions.slice(0, imageCount);
    } else if (sceneDescriptions.length < imageCount) {
      // 시퀀스가 적으면 그 수만큼만 생성
      console.log(
        `Adjusting image count from ${imageCount} to ${sceneDescriptions.length} based on sequences`
      );
    }
  } else {
    console.log("Step 1: Generating scene descriptions from script...");
    onProgress?.("대본 분석 중...");
    const scenesPrompt = `다음 한국어 대본을 분석하세요. ${imageCount}개의 주요 시각적 장면으로 나누세요. 각 장면에 대해 이미지 생성 프롬프트로 사용할 수 있는 짧고 설명적인 캡션을 한국어로 제공하세요. 결과를 문자열의 JSON 배열로 반환하세요: \`["장면 1 설명", "장면 2 설명", ...]\`. 대본: \n\n${script}`;

    const scenesResponse = await retryWithBackoff(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: scenesPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        }),
      3,
      2000
    );

    sceneDescriptions = JSON.parse(scenesResponse.text);
  }

  console.log(
    `Step 2: Generating ${sceneDescriptions.length} storyboard images sequentially...`
  );
  onProgress?.(`${sceneDescriptions.length}개 영상 이미지 생성 준비 중...`);

  const storyboardResults: any[] = [];

  for (let i = 0; i < sceneDescriptions.length; i++) {
    const scene = sceneDescriptions[i];
    console.log(
      `Processing scene ${i + 1}/${sceneDescriptions.length}: ${scene.substring(
        0,
        50
      )}...`
    );
    onProgress?.(`영상 이미지 ${i + 1}/${sceneDescriptions.length} 생성 중`);

    try {
      // 각 요청 사이에 3-4초 지연 (영상 소스는 더 복잡하므로)
      if (i > 0) {
        const delay = 3000 + Math.random() * 1000; // 3-4초 랜덤 지연
        console.log(`Waiting ${Math.round(delay / 1000)}s before next scene generation...`);
        onProgress?.(`다음 이미지 생성 전 대기 중... (${Math.round(delay / 1000)}초)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const parts: any[] = [];

      // 참조 이미지가 있는 경우 추가
      if (referenceImage) {
        parts.push({
          inlineData: {
            data: referenceImage,
            mimeType: "image/jpeg",
          },
        });
        parts.push({
          text: "Style reference image - please maintain consistency with this visual style",
        });
      }

      // 캐릭터 참조 이미지 추가 (있는 경우에만)
      characters.forEach((char) => {
        parts.push({
          inlineData: {
            data: char.image,
            mimeType: "image/jpeg",
          },
        });
        parts.push({ text: `Reference image for character: ${char.name}` });
      });

      // 스타일에 따른 이미지 생성 프롬프트
      let imageGenPrompt: string;
      const subtitleText = subtitleEnabled
        ? "한국어 자막을 포함하여"
        : "자막 없이";
      const hasCharacters = characters.length > 0;
      const hasReference =
        referenceImage !== null && referenceImage !== undefined;

      // 프롬프트 시작 부분 (캐릭터 유무에 따라 다름)
      let promptStart = "";
      if (hasCharacters && hasReference) {
        promptStart =
          "제공된 참조 캐릭터 이미지와 스타일 참조 이미지를 사용하여";
      } else if (hasCharacters) {
        promptStart = "제공된 참조 캐릭터 이미지를 사용하여";
      } else if (hasReference) {
        promptStart = "제공된 스타일 참조 이미지의 시각적 일관성을 유지하면서";
      } else {
        promptStart = ""; // 둘 다 없는 경우 (이론상 발생하지 않아야 함)
      }

      // 캐릭터 일관성 안내 (캐릭터가 있을 때만)
      const characterConsistency = hasCharacters
        ? " 장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요."
        : "";

      if (imageStyle === "animation") {
        imageGenPrompt = `${promptStart} 이 장면에 대한 애니메이션 스타일 이미지를 ${subtitleText} 만드세요: "${scene}".${characterConsistency} 
                애니메이션/만화 스타일로 그려주세요. 밝고 컬러풀한 애니메이션 아트 스타일, ${aspectRatio} 비율로 이미지를 생성하고, 
                주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${
                  subtitleEnabled
                    ? " 화면 하단에 한국어 자막을 자연스럽게 배치해주세요."
                    : ""
                }`;
      } else {
        imageGenPrompt = `${promptStart} 이 장면에 대한 사실적인 이미지를 ${subtitleText} 만드세요: "${scene}".${characterConsistency} 
                실사 영화 스타일, 시네마틱 ${aspectRatio} 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${
          subtitleEnabled
            ? " 화면 하단에 한국어 자막을 자연스럽게 배치해주세요."
            : ""
        }`;
      }
      parts.push({ text: imageGenPrompt });

      let imageResponse;
      let finalScene = scene;
      let contentPolicyRetry = false;
      let replacementInfo: Array<{ original: string; replacement: string }> =
        [];

      try {
        // 1단계: 원래 프롬프트로 시도 (재시도 로직 포함)
        imageResponse = await retryWithBackoff(
          () =>
            ai.models.generateContent({
              model: "gemini-2.5-flash-image-preview",
              contents: { parts },
              config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
              },
            }),
          3,
          2000
        );
      } catch (firstError: any) {
        // 콘텐츠 정책 위반 감지
        const errorMessage = firstError?.message || String(firstError);
        const isSafetyError =
          errorMessage.includes("SAFETY") ||
          errorMessage.includes("BLOCK") ||
          errorMessage.includes("content policy") ||
          errorMessage.includes("harmful content") ||
          errorMessage.includes("콘텐츠 정책");

        if (isSafetyError) {
          console.warn(
            `⚠️ Content policy violation detected for scene ${
              i + 1
            }, attempting with safe words...`
          );
          contentPolicyRetry = true;

          // 2단계: 안전한 단어로 교체하여 재시도
          const { replacedText, replacements } = replaceUnsafeWords(scene);
          replacementInfo = replacements;

          if (replacements.length > 0) {
            console.log(
              `🔄 Replacing words: ${replacements
                .map((r) => `"${r.original}" → "${r.replacement}"`)
                .join(", ")}`
            );

            finalScene = replacedText;

            // 새로운 parts 배열 생성 (교체된 텍스트로)
            const safeParts: any[] = [];

            // 참조 이미지 다시 추가
            if (referenceImage) {
              safeParts.push({
                inlineData: {
                  data: referenceImage,
                  mimeType: "image/jpeg",
                },
              });
              safeParts.push({
                text: "Style reference image - please maintain consistency with this visual style",
              });
            }

            // 캐릭터 참조 이미지 다시 추가
            characters.forEach((char) => {
              safeParts.push({
                inlineData: {
                  data: char.image,
                  mimeType: "image/jpeg",
                },
              });
              safeParts.push({
                text: `Reference image for character: ${char.name}`,
              });
            });

            // 교체된 장면 설명으로 새 프롬프트 생성
            const safeImageGenPrompt = imageGenPrompt.replace(
              scene,
              replacedText
            );
            const { replacedText: fullySafePrompt } =
              replaceUnsafeWords(safeImageGenPrompt);
            safeParts.push({ text: fullySafePrompt });

            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 지연

            imageResponse = await retryWithBackoff(
              () =>
                ai.models.generateContent({
                  model: "gemini-2.5-flash-image-preview",
                  contents: { parts: safeParts },
                  config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                  },
                }),
              3,
              2000
            );
          } else {
            throw firstError; // 교체할 단어가 없으면 원래 에러 발생
          }
        } else {
          throw firstError; // 콘텐츠 정책 외 에러는 그대로 발생
        }
      }

      const imagePart = imageResponse?.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData
      );
      if (!imagePart?.inlineData?.data) {
        console.warn(`Image generation might have failed for scene: ${scene}`);
        storyboardResults.push({
          id: self.crypto.randomUUID(),
          image: "",
          sceneDescription: scene,
        });
      } else {
        let displayDescription = scene;

        // 콘텐츠 정책 재시도로 생성된 경우 설명에 알림 추가
        if (contentPolicyRetry && replacementInfo.length > 0) {
          const replacementText = replacementInfo
            .map((r) => `"${r.original}"을(를) "${r.replacement}"(으)로`)
            .join(", ");
          displayDescription = `${scene}\n\n⚠️ 알림: 콘텐츠 정책 준수를 위해 ${replacementText} 교체하여 생성되었습니다.`;
          console.log(
            `✅ Successfully generated scene ${i + 1} with word replacement`
          );
        }

        storyboardResults.push({
          id: self.crypto.randomUUID(),
          image: imagePart.inlineData.data,
          sceneDescription: displayDescription,
        });
        console.log(`Successfully generated image for scene ${i + 1}`);
      }
    } catch (error) {
      console.error(`Error generating scene ${i + 1}:`, error);
      
      // 에러 원인 분석
      let errorReason = "";
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("safety") || msg.includes("block") || msg.includes("policy")) {
          errorReason = " (콘텐츠 정책 위반 - 장면 설명을 수정해주세요)";
        } else if (msg.includes("quota") || msg.includes("limit")) {
          errorReason = " (API 사용량 초과 - 잠시 후 재시도)";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          errorReason = " (네트워크 오류)";
        } else if (msg.includes("timeout")) {
          errorReason = " (시간 초과)";
        } else {
          errorReason = ` (${error.message})`;
        }
      }
      
      storyboardResults.push({
        id: self.crypto.randomUUID(),
        image: "",
        sceneDescription: `❌ 장면 ${i + 1} 생성 실패${errorReason}\n원본: ${scene}`,
      });
    }
  }

  return storyboardResults;
};

export const regenerateStoryboardImage = async (
  sceneDescription: string,
  characters: Character[],
  apiKey?: string,
  imageStyle: "realistic" | "animation" = "realistic",
  subtitleEnabled: boolean = true,
  referenceImage?: string | null,
  aspectRatio: AspectRatio = "16:9"
): Promise<string> => {
  const ai = getGoogleAI(apiKey);
  console.log(`Regenerating image for scene: ${sceneDescription}`);

  const parts: any[] = [];

  // 참조 이미지가 있는 경우 추가
  if (referenceImage) {
    parts.push({
      inlineData: {
        data: referenceImage,
        mimeType: "image/jpeg",
      },
    });
    parts.push({
      text: "Style reference image - please maintain consistency with this visual style",
    });
  }

  // 캐릭터 참조 이미지 추가 (있는 경우에만)
  characters.forEach((char) => {
    parts.push({ inlineData: { data: char.image, mimeType: "image/jpeg" } });
    parts.push({ text: `Reference image for character: ${char.name}` });
  });

  // 스타일에 따른 이미지 생성 프롬프트
  let imageGenPrompt: string;
  const subtitleText = subtitleEnabled ? "한국어 자막을 포함하여" : "자막 없이";
  const hasCharacters = characters.length > 0;
  const hasReference = referenceImage !== null && referenceImage !== undefined;

  // 프롬프트 시작 부분 (캐릭터 유무에 따라 다름)
  let promptStart = "";
  if (hasCharacters && hasReference) {
    promptStart = "제공된 참조 캐릭터 이미지와 스타일 참조 이미지를 사용하여";
  } else if (hasCharacters) {
    promptStart = "제공된 참조 캐릭터 이미지를 사용하여";
  } else if (hasReference) {
    promptStart = "제공된 스타일 참조 이미지의 시각적 일관성을 유지하면서";
  } else {
    promptStart = ""; // 둘 다 없는 경우 (이론상 발생하지 않아야 함)
  }

  // 캐릭터 일관성 안내 (캐릭터가 있을 때만)
  const characterConsistency = hasCharacters
    ? " 장면에 나오는 캐릭터의 얼굴과 외모가 참조 이미지와 일치하는지 확인하세요."
    : "";

  if (imageStyle === "animation") {
    imageGenPrompt = `${promptStart} 이 장면에 대한 애니메이션 스타일 이미지를 ${subtitleText} 만드세요: "${sceneDescription}".${characterConsistency} 
        애니메이션/만화 스타일로 그려주세요. 밝고 컬러풀한 애니메이션 아트 스타일, ${aspectRatio} 비율로 이미지를 생성하고, 
        주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${
          subtitleEnabled
            ? " 화면 하단에 한국어 자막을 자연스럽게 배치해주세요."
            : ""
        }`;
  } else {
    imageGenPrompt = `${promptStart} 이 장면에 대한 상세한 이미지를 ${subtitleText} 만드세요: "${sceneDescription}".${characterConsistency} 
        시네마틱 ${aspectRatio} 비율로 이미지를 생성하고, 주요 인물이나 사물이 잘리지 않도록 구도를 잡아주세요.${
      subtitleEnabled
        ? " 화면 하단에 한국어 자막을 자연스럽게 배치해주세요."
        : ""
    }`;
  }
  parts.push({ text: imageGenPrompt });

  let imageResponse;

  try {
    // 1단계: 원래 프롬프트로 시도
    imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
  } catch (firstError: any) {
    // 콘텐츠 정책 위반 감지
    const errorMessage = firstError?.message || String(firstError);
    const isSafetyError =
      errorMessage.includes("SAFETY") ||
      errorMessage.includes("BLOCK") ||
      errorMessage.includes("content policy") ||
      errorMessage.includes("harmful content") ||
      errorMessage.includes("콘텐츠 정책");

    if (isSafetyError) {
      console.warn(
        `⚠️ Content policy violation detected during regeneration, attempting with safe words...`
      );

      // 2단계: 안전한 단어로 교체하여 재시도
      const { replacedText, replacements } =
        replaceUnsafeWords(sceneDescription);

      if (replacements.length > 0) {
        console.log(
          `🔄 Replacing words: ${replacements
            .map((r) => `"${r.original}" → "${r.replacement}"`)
            .join(", ")}`
        );

        // 새로운 parts 배열 생성 (교체된 텍스트로)
        const safeParts: any[] = [];

        // 참조 이미지 다시 추가
        if (referenceImage) {
          safeParts.push({
            inlineData: {
              data: referenceImage,
              mimeType: "image/jpeg",
            },
          });
          safeParts.push({
            text: "Style reference image - please maintain consistency with this visual style",
          });
        }

        // 캐릭터 참조 이미지 다시 추가
        characters.forEach((char) => {
          safeParts.push({
            inlineData: { data: char.image, mimeType: "image/jpeg" },
          });
          safeParts.push({
            text: `Reference image for character: ${char.name}`,
          });
        });

        // 교체된 장면 설명으로 새 프롬프트 생성
        const safeImageGenPrompt = imageGenPrompt.replace(
          sceneDescription,
          replacedText
        );
        const { replacedText: fullySafePrompt } =
          replaceUnsafeWords(safeImageGenPrompt);
        safeParts.push({ text: fullySafePrompt });

        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 지연

        imageResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: { parts: safeParts },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        console.log(`✅ Successfully regenerated with word replacement`);
      } else {
        throw firstError; // 교체할 단어가 없으면 원래 에러 발생
      }
    } else {
      throw firstError; // 콘텐츠 정책 외 에러는 그대로 발생
    }
  }

  const imagePart = imageResponse?.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData
  );
  if (!imagePart?.inlineData?.data) {
    throw new Error(`Image regeneration failed for scene: ${sceneDescription}`);
  }

  return imagePart.inlineData.data;
};

// 카메라 앵글 정보 매핑
const CAMERA_ANGLES: Array<{
  angle: CameraAngle;
  nameKo: string;
  description: string;
  prompt: string;
}> = [
  {
    angle: 'Eye-Level Shot',
    nameKo: '눈높이 샷',
    description: '피사체와 같은 눈높이에서 촬영',
    prompt: 'eye-level shot, camera at subject eye height, natural perspective, straight-on view, professional photography'
  },
  {
    angle: 'High-Angle Shot',
    nameKo: '하이 앵글',
    description: '위에서 아래로 촬영',
    prompt: 'high angle shot, camera looking down, elevated perspective, overhead view, professional photography'
  },
  {
    angle: 'Low-Angle Shot',
    nameKo: '로우 앵글',
    description: '아래에서 위로 촬영',
    prompt: 'low angle shot, camera looking up, ground level perspective, upward view, professional photography'
  },
  {
    angle: 'Dutch Angle',
    nameKo: '더치 앵글',
    description: '카메라를 기울여 긴장감 연출',
    prompt: 'dutch angle, tilted camera angle, diagonal composition, dynamic tension, professional photography'
  },
  {
    angle: 'Bird\'s-Eye View',
    nameKo: '버드아이 뷰',
    description: '진짜 위에서 내려다본 구도',
    prompt: 'birds eye view, directly overhead, top-down perspective, aerial view, professional photography'
  },
  {
    angle: 'Point of View',
    nameKo: 'POV',
    description: '1인칭 시점',
    prompt: 'point of view shot, first-person perspective, subjective camera angle, as seen through eyes, professional photography'
  },
  {
    angle: 'Over-the-Shoulder',
    nameKo: '어깨 너머 샷',
    description: '어깨 너머로 보는 구도',
    prompt: 'over the shoulder shot, viewing from behind shoulder, conversational angle, professional photography'
  },
  {
    angle: 'Close-up',
    nameKo: '클로즈업',
    description: '얼굴이나 대상을 가까이',
    prompt: 'close-up shot, tight framing, detailed view, face or object filling frame, professional photography'
  },
  {
    angle: 'Wide Shot',
    nameKo: '와이드 샷',
    description: '넓은 배경과 함께',
    prompt: 'wide shot, full body and environment, establishing shot, expansive view, professional photography'
  },
  {
    angle: 'Rule of Thirds',
    nameKo: '삼분할 구도',
    description: '화면을 3등분하여 배치',
    prompt: 'rule of thirds composition, subject on intersection points, balanced framing, professional photography'
  }
];

/**
 * 한 장의 이미지를 10가지 카메라 앵글로 변환
 * @param sourceImage - base64 인코딩된 원본 이미지 (참고용)
 * @param apiKey - Google AI API 키
 * @param aspectRatio - 출력 이미지 비율
 * @param onProgress - 진행 상황 콜백
 * @returns 10개의 카메라 앵글 이미지 배열
 */
export const generateCameraAngles = async (
  sourceImage: string,
  apiKey?: string,
  aspectRatio: AspectRatio = "16:9",
  onProgress?: (message: string, current: number, total: number) => void
): Promise<CameraAngleImage[]> => {
  const ai = getGoogleAI(apiKey);
  const results: CameraAngleImage[] = [];
  const totalAngles = CAMERA_ANGLES.length;

  console.log(`🎬 Starting camera angle generation for ${totalAngles} angles...`);
  onProgress?.("카메라 앵글 변환 시작...", 0, totalAngles);

  // 사용자 안내: 이 기능은 원본 이미지의 "주제"를 텍스트로 설명해야 합니다
  // Imagen 4.0은 현재 text-to-image만 지원하므로, 
  // 실제로는 같은 주제에 대해 다양한 앵글을 생성합니다

  for (let i = 0; i < CAMERA_ANGLES.length; i++) {
    const angleInfo = CAMERA_ANGLES[i];
    console.log(`Processing angle ${i + 1}/${totalAngles}: ${angleInfo.nameKo}`);
    onProgress?.(
      `${angleInfo.nameKo} (${i + 1}/${totalAngles}) 생성 중...`,
      i + 1,
      totalAngles
    );

    try {
      // API 과부하 방지: 5-6초 지연 (더 여유있게)
      if (i > 0) {
        const delay = 5000 + Math.random() * 1000; // 5-6초
        console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next request...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // 간단하고 명확한 프롬프트
      const prompt = `${angleInfo.prompt}, ${aspectRatio} aspect ratio, professional photography, high quality`;

      console.log(`📸 Generating with prompt: ${prompt}`);

      const imageResponse = await retryWithBackoff(
        () =>
          ai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: "image/png", // PNG 사용
              aspectRatio: aspectRatio,
            },
          }),
        2, // 재시도 횟수 줄임 (2회)
        4000 // 재시도 간격 4초
      );

      const imageBytes = imageResponse?.generatedImages?.[0]?.image?.imageBytes;

      if (!imageBytes) {
        throw new Error("No image data returned from API");
      }

      // PNG base64로 변환
      const base64Image = `data:image/png;base64,${imageBytes}`;

      results.push({
        id: self.crypto.randomUUID(),
        angle: angleInfo.angle,
        image: base64Image,
        angleName: angleInfo.nameKo,
        description: angleInfo.description,
      });

      console.log(`✅ Successfully generated ${angleInfo.nameKo}`);
      
    } catch (error) {
      console.error(`❌ Error generating ${angleInfo.nameKo}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Quota 초과 시 즉시 중단하고 사용자에게 알림
      if (errorMessage.includes("QUOTA") || 
          errorMessage.includes("429") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("exceeded")) {
        
        const generated = i; // 현재까지 생성된 개수
        throw new Error(
          `❌ API 할당량 초과\n\n` +
          `✅ ${generated}개 앵글 생성 완료\n` +
          `⏸️ 나머지 ${totalAngles - generated}개는 대기\n\n` +
          `💡 해결 방법:\n` +
          `1. 15-20분 후 다시 시도\n` +
          `2. Google Cloud 콘솔에서 할당량 확인\n` +
          `3. 생성된 이미지 먼저 다운로드하세요\n\n` +
          `⚠️ 카메라 앵글 생성은 API를 많이 사용합니다`
        );
      }
      
      // 네트워크 에러
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        throw new Error(
          `❌ 네트워크 오류\n\n` +
          `✅ ${i}개 앵글 생성 완료\n\n` +
          `💡 인터넷 연결을 확인하고 다시 시도하세요`
        );
      }
      
      // 기타 에러는 빈 이미지로 표시하고 계속 진행
      results.push({
        id: self.crypto.randomUUID(),
        angle: angleInfo.angle,
        image: "",
        angleName: angleInfo.nameKo,
        description: `생성 실패: ${errorMessage.substring(0, 100)}`,
      });
      
      console.warn(`⚠️ Continuing with remaining angles...`);
    }
  }

  const successCount = results.filter(r => r.image && r.image.trim() !== "").length;
  console.log(`🎉 Camera angle generation completed: ${successCount}/${totalAngles} successful`);
  
  onProgress?.(`완료: ${successCount}/${totalAngles}개 생성됨`, totalAngles, totalAngles);

  return results;
};
