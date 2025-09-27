import React from 'react';
import DisplayAd from './DisplayAd';

interface ApiKeyGuideProps {
    onBack?: () => void;
}

const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* 헤더 */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Google Gemini API 키 발급 가이드
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        유튜브 롱폼 이미지 생성기를 사용하기 위해 필요한 Google Gemini API 키를 발급받는 방법을 단계별로 안내드립니다.
                    </p>
                </div>

                {/* 중요 안내 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-amber-500 text-2xl">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-800 mb-2">중요사항</h3>
                                <div className="text-sm text-amber-700 space-y-1">
                                    <p>• API 키는 개인정보로 절대 타인과 공유하지 마세요.</p>
                                    <p>• Google AI Studio는 무료로 제공되지만, 사용량 제한이 있습니다.</p>
                                    <p>• API 키가 없으면 이미지 생성 기능을 사용할 수 없습니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 1단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500">
                        <div className="flex items-center mb-6">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">1</span>
                            <h2 className="text-2xl font-semibold text-gray-900">Google AI Studio 접속</h2>
                        </div>
                        
                        <div className="mb-6">
                            <img src="/api 1.png" alt="Google AI Studio 메인 화면" className="w-full rounded-lg border shadow-sm" />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                <strong>Google AI Studio</strong>에 접속합니다. 브라우저 주소창에 다음 URL을 입력하세요:
                            </p>
                            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                                https://aistudio.google.com/
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                                Google 계정으로 로그인이 필요합니다. 개인용 Gmail 계정을 사용하는 것을 권장합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 첫 번째 광고 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <DisplayAd />
                </div>

                {/* 2단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500 mt-8">
                        <div className="flex items-center mb-6">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">2</span>
                            <h2 className="text-2xl font-semibold text-gray-900">API Key 메뉴 찾기</h2>
                        </div>
                        
                        <div className="mb-6">
                            <img src="/api 2.png" alt="API Key 메뉴 위치" className="w-full rounded-lg border shadow-sm" />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                Google AI Studio 메인 화면에서 왼쪽 사이드바에 있는 <strong>"API Key"</strong> 메뉴를 클릭합니다.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <p className="text-blue-800 text-sm">
                                    💡 <strong>팁:</strong> 사이드바가 보이지 않는다면 왼쪽 상단의 햄버거 메뉴(☰)를 클릭하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500">
                        <div className="flex items-center mb-6">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">3</span>
                            <h2 className="text-2xl font-semibold text-gray-900">새 API Key 생성</h2>
                        </div>
                        
                        <div className="mb-6">
                            <img src="/api 3.png" alt="새 API Key 생성 버튼" className="w-full rounded-lg border shadow-sm" />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                API Key 페이지에서 <strong>"Create API Key"</strong> 또는 <strong>"API 키 만들기"</strong> 버튼을 클릭합니다.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                기존에 생성된 API 키가 있다면 목록에서 확인할 수 있습니다. 새로 만들거나 기존 키를 사용할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 두 번째 광고 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <DisplayAd />
                </div>

                {/* 4단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500 mt-8">
                        <div className="flex items-center mb-6">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">4</span>
                            <h2 className="text-2xl font-semibold text-gray-900">프로젝트 선택</h2>
                        </div>
                        
                        <div className="mb-6">
                            <img src="/api 4.png" alt="프로젝트 선택 화면" className="w-full rounded-lg border shadow-sm" />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                API 키를 생성할 Google Cloud 프로젝트를 선택합니다. 대부분의 경우 기본 프로젝트를 사용하면 됩니다.
                            </p>
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <p className="text-green-800 text-sm">
                                    ✅ <strong>추천:</strong> "Create API key in new project"를 선택하여 새 프로젝트에서 키를 생성하는 것을 권장합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-500">
                        <div className="flex items-center mb-6">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">5</span>
                            <h2 className="text-2xl font-semibold text-gray-900">API Key 복사</h2>
                        </div>
                        
                        <div className="mb-6">
                            <img src="/api 5.png" alt="생성된 API Key" className="w-full rounded-lg border shadow-sm" />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                API 키가 성공적으로 생성되면 키 값이 표시됩니다. <strong>"Copy"</strong> 버튼을 클릭하여 클립보드에 복사하세요.
                            </p>
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <p className="text-red-800 text-sm">
                                    🔒 <strong>보안 주의:</strong> 이 API 키는 다시 표시되지 않습니다. 안전한 곳에 저장해두세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 세 번째 광고 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <DisplayAd />
                </div>

                {/* 6단계 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-green-500 mt-8">
                        <div className="flex items-center mb-6">
                            <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold mr-4">6</span>
                            <h2 className="text-2xl font-semibold text-gray-900">이미지 생성기에 적용</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                복사한 API 키를 유튜브 이미지 생성기의 "API 키 입력" 필드에 붙여넣기하세요.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">API 키 입력 방법:</h4>
                                <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                                    <li>메인 페이지의 "1️⃣ API 키 입력" 섹션으로 이동</li>
                                    <li>비밀번호 입력 필드에 복사한 API 키 붙여넣기</li>
                                    <li>"API 키 기억하기" 체크박스 선택 (선택사항)</li>
                                    <li>페르소나 생성 또는 영상 소스 생성 시작</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 문제 해결 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded-r-lg">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-4">자주 발생하는 문제와 해결법</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-yellow-800">Q: API 키를 입력했는데 오류가 발생해요</h4>
                                <p className="text-yellow-700 text-sm mt-1">
                                    A: API 키 앞뒤에 공백이 없는지 확인하고, 키 전체가 정확히 복사되었는지 확인하세요.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-yellow-800">Q: "사용량 초과" 메시지가 나타나요</h4>
                                <p className="text-yellow-700 text-sm mt-1">
                                    A: Google AI Studio의 무료 할당량을 초과했을 수 있습니다. 잠시 기다린 후 다시 시도하세요.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-yellow-800">Q: API 키를 잊어버렸어요</h4>
                                <p className="text-yellow-700 text-sm mt-1">
                                    A: Google AI Studio에서 새로운 API 키를 생성하거나 기존 키를 확인할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 마지막 광고 - 콘텐츠와 동일한 너비 */}
                <div className="max-w-4xl mx-auto">
                    <DisplayAd />
                </div>

                {/* 완료 메시지 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg mt-8">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-green-500 text-2xl">✅</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-green-800">설정 완료!</h3>
                                <p className="text-green-700 mt-2">
                                    이제 Google Gemini API 키가 준비되었습니다. 유튜브 이미지 생성기로 돌아가서 멋진 캐릭터와 영상 소스를 만들어보세요!
                                </p>
                                <div className="mt-4">
                                    <button
                                        onClick={onBack || (() => window.history.back())}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        🏠 메인 페이지로 돌아가기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyGuide;