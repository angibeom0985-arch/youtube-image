import React from 'react';

interface ImagePromptGuideProps {
    onBack?: () => void;
}

const ImagePromptGuide: React.FC<ImagePromptGuideProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* 헤더 */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🎯 내가 원하는 이미지 200% 뽑는 노하우
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        AI가 정확히 이해할 수 있는 이미지 프롬프트 작성법을 알아보세요
                    </p>
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            ← 돌아가기
                        </button>
                    )}
                </div>

                {/* 기본 구조 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-purple-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">📝</span>
                            이미지 프롬프트 기본 구조
                        </h2>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                효과적인 이미지 프롬프트는 다음과 같은 구조를 따라야 합니다:
                            </p>
                            
                            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-purple-800 mb-2">프롬프트 구성 요소:</h4>
                                <ol className="text-purple-800 text-sm space-y-2 list-decimal list-inside">
                                    <li><strong>주제(Subject):</strong> 무엇을 그릴 것인가</li>
                                    <li><strong>스타일(Style):</strong> 어떤 스타일로 그릴 것인가</li>
                                    <li><strong>구도(Composition):</strong> 어떤 각도와 구도로 그릴 것인가</li>
                                    <li><strong>조명(Lighting):</strong> 조명과 분위기</li>
                                    <li><strong>품질 키워드:</strong> 이미지 품질을 높이는 키워드</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 좋은 프롬프트 예시 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-green-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">✅</span>
                            좋은 프롬프트 예시
                        </h2>
                        
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">예시 1: 인물 촬영</h4>
                                <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800">
                                    "A professional headshot of a 30-year-old Korean woman, confident smile, wearing a modern business suit, sitting in a bright office, natural lighting, shot with 85mm lens, high resolution, photorealistic, detailed facial features"
                                </div>
                                <p className="text-green-700 text-sm mt-2">
                                    → 구체적인 연령, 국적, 표정, 의상, 배경, 조명을 모두 명시
                                </p>
                            </div>

                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">예시 2: 캐릭터 일러스트</h4>
                                <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800">
                                    "Anime style illustration of a cheerful young chef, colorful apron, holding a wooden spoon, kitchen background with warm lighting, Studio Ghibli art style, vibrant colors, detailed character design"
                                </div>
                                <p className="text-green-700 text-sm mt-2">
                                    → 스타일, 직업, 소품, 배경, 참조 스타일을 구체적으로 명시
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 피해야 할 것들 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-red-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">❌</span>
                            피해야 할 프롬프트 작성법
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-red-800 mb-2">너무 간단한 프롬프트</h4>
                                <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800 mb-2">
                                    "사람", "예쁜 여자", "멋진 남자"
                                </div>
                                <p className="text-red-700 text-sm">
                                    → 구체적이지 않아서 원하는 결과를 얻기 어려움
                                </p>
                            </div>

                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-red-800 mb-2">모순되는 설명</h4>
                                <div className="bg-white p-3 rounded border text-sm font-mono text-gray-800 mb-2">
                                    "realistic anime character", "dark bright lighting"
                                </div>
                                <p className="text-red-700 text-sm">
                                    → 상충되는 키워드는 AI를 혼란스럽게 만듦
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 품질 향상 키워드 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">🔥</span>
                            품질을 높이는 마법의 키워드
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">사실적 이미지용</h4>
                                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                                    <li>"high resolution", "4K", "8K"</li>
                                    <li>"photorealistic", "hyperrealistic"</li>
                                    <li>"professional photography"</li>
                                    <li>"detailed facial features"</li>
                                    <li>"natural lighting", "soft lighting"</li>
                                    <li>"sharp focus", "depth of field"</li>
                                </ul>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">일러스트/애니메이션용</h4>
                                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                                    <li>"digital art", "concept art"</li>
                                    <li>"vibrant colors", "detailed illustration"</li>
                                    <li>"anime style", "manga style"</li>
                                    <li>"Studio Ghibli style"</li>
                                    <li>"cel shading", "flat colors"</li>
                                    <li>"character design sheet"</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 실용적인 팁 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-yellow-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">💡</span>
                            실용적인 프롬프트 작성 팁
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <h4 className="font-semibold text-yellow-800 mb-2">🎯 구체적으로 작성</h4>
                                    <p className="text-yellow-700 text-sm">
                                        "젊은 여성" 보다는 "25세 한국인 여성, 긴 검은 머리, 밝은 미소"처럼 구체적으로 작성하세요.
                                    </p>
                                </div>
                                
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <h4 className="font-semibold text-yellow-800 mb-2">🎨 스타일 참조</h4>
                                    <p className="text-yellow-700 text-sm">
                                        "in the style of [아티스트명]" 또는 "Studio Ghibli style"같이 참조할 스타일을 명시하세요.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-yellow-800 mb-2">📐 구도와 각도 명시</h4>
                                <p className="text-yellow-700 text-sm mb-2">사진 구도를 명확히 하면 더 나은 결과를 얻을 수 있습니다:</p>
                                <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside ml-4">
                                    <li><strong>정면:</strong> "front view", "facing camera"</li>
                                    <li><strong>측면:</strong> "side view", "profile shot"</li>
                                    <li><strong>상반신:</strong> "upper body shot", "portrait"</li>
                                    <li><strong>전신:</strong> "full body shot"</li>
                                    <li><strong>클로즈업:</strong> "close-up", "headshot"</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Google Gemini 특화 팁 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-indigo-500">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">🚀</span>
                            Google Gemini 특화 팁
                        </h2>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                Google Gemini API는 영어 프롬프트에 최적화되어 있습니다. 다음 사항들을 참고하세요:
                            </p>
                            
                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-indigo-800 mb-2">언어 사용법:</h4>
                                <ul className="text-indigo-700 text-sm space-y-1 list-disc list-inside">
                                    <li><strong>영어 우선:</strong> 가능한 한 영어로 작성하는 것이 좋습니다</li>
                                    <li><strong>한영 혼용:</strong> 한국적 특성이 필요한 경우 "Korean traditional hanbok" 처럼 혼용</li>
                                    <li><strong>문화적 맥락:</strong> "K-pop idol style", "Korean beauty standards" 등</li>
                                </ul>
                            </div>
                            
                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-indigo-800 mb-2">권장 프롬프트 길이:</h4>
                                <p className="text-indigo-700 text-sm">
                                    너무 짧지도, 너무 길지도 않은 50-150단어 정도가 적절합니다. 
                                    핵심 요소들을 쉼표로 구분하여 작성하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 참고 자료 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-100 rounded-lg p-6 shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">📚 더 자세한 정보</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            이 가이드는 Google Gemini API 공식 문서를 기반으로 작성되었습니다.
                        </p>
                        <a 
                            href="https://ai.google.dev/gemini-api/docs/image-generation?hl=ko" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                            <span className="mr-2">📖</span>
                            Gemini API 공식 문서 보기
                            <span className="ml-2">↗</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImagePromptGuide;