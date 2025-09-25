// 콘텐츠 정책 위반 단어 및 안전한 대체어 매핑
export const UNSAFE_WORDS_MAP = {
    // 범죄 관련
    '공범': '협력자',
    '범죄자': '인물',
    '악역': '상대역',
    '악인': '인물',
    '범인': '인물',
    '살인자': '인물',
    '도둑': '인물',
    '강도': '인물',
    
    // 폭력 관련
    '위험한': '신중한',
    '무서운': '진지한',
    '위협적인': '당당한',
    '잔인한': '엄격한',
    '포악한': '강인한',
    
    // 외모/분위기 관련
    '어둠': '진한 색',
    '어두운': '진한 색의',
    '검은': '어두운 색의',
    '미스터리한': '신비로운',
    '수상한': '독특한',
    '의심스러운': '신중한',
    
    // 기타 부정적 표현
    '사악한': '카리스마 있는',
    '음험한': '신중한',
    '교활한': '영리한',
    '불길한': '신비로운'
};

// 위반 단어 감지 함수
export const detectUnsafeWords = (text: string): string[] => {
    const foundWords: string[] = [];
    
    Object.keys(UNSAFE_WORDS_MAP).forEach(unsafeWord => {
        if (text.includes(unsafeWord)) {
            foundWords.push(unsafeWord);
        }
    });
    
    return foundWords;
};

// 안전한 단어로 자동 교체 함수
export const replaceUnsafeWords = (text: string): { 
    replacedText: string; 
    replacements: Array<{original: string; replacement: string}> 
} => {
    let replacedText = text;
    const replacements: Array<{original: string; replacement: string}> = [];
    
    Object.entries(UNSAFE_WORDS_MAP).forEach(([unsafeWord, safeWord]) => {
        if (replacedText.includes(unsafeWord)) {
            replacedText = replacedText.replace(new RegExp(unsafeWord, 'g'), safeWord);
            replacements.push({ original: unsafeWord, replacement: safeWord });
        }
    });
    
    return { replacedText, replacements };
};

// 텍스트가 안전한지 확인하는 함수
export const isTextSafe = (text: string): boolean => {
    return detectUnsafeWords(text).length === 0;
};