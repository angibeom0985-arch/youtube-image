import { GoogleGenAI } from "@google/genai";

// API 키 테스트 함수
export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    try {
        console.log("🧪 Testing API key...");
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: '간단한 인사말을 해주세요.',
        });
        
        const text = response.text;
        console.log("✅ API key test successful:", text);
        
        return {
            success: true,
            message: `API 키가 정상적으로 작동합니다: ${text.substring(0, 50)}...`
        };
    } catch (error) {
        console.error("❌ API key test failed:", error);
        
        let errorMessage = "API 키 테스트 실패";
        if (error instanceof Error) {
            if (error.message.includes('API_KEY_INVALID') || error.message.includes('Invalid API key')) {
                errorMessage = "올바르지 않은 API 키입니다.";
            } else if (error.message.includes('PERMISSION_DENIED')) {
                errorMessage = "API 키에 필요한 권한이 없습니다.";
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                errorMessage = "API 사용량이 초과되었습니다.";
            } else {
                errorMessage = error.message;
            }
        }
        
        return {
            success: false,
            message: errorMessage
        };
    }
};