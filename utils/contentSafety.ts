// 콘텐츠 정책 위반 단어 및 안전한 대체어 매핑
export const UNSAFE_WORDS_MAP: Record<string, string> = {
    // 범죄 관련
    '공범': '협력자',
    '범죄자': '인물',
    '악역': '상대역',
    '악인': '인물',
    '범인': '인물',
    '살인자': '인물',
    '살인': '사건',
    '도둑': '인물',
    '강도': '인물',
    '범죄': '사건',
    '납치': '사건',
    
    // 폭력 관련
    '위험한': '신중한',
    '위험': '조심스러운',
    '무서운': '진지한',
    '위협적인': '당당한',
    '위협': '도전',
    '잔인한': '엄격한',
    '잔인': '강한',
    '포악한': '강인한',
    '폭력': '힘',
    '공격': '행동',
    '싸움': '경쟁',
    '무기': '도구',
    '칼': '도구',
    '총': '도구',
    '피': '붉은색',
    '죽음': '종말',
    '죽은': '고요한',
    '죽이': '멈추',
    
    // 외모/분위기 관련
    '어둠': '진한 색',
    '어두운': '진한 색의',
    '검은': '어두운 색의',
    '미스터리한': '신비로운',
    '수상한': '독특한',
    '의심스러운': '신중한',
    '괴물': '독특한 존재',
    '귀신': '신비로운 존재',
    '유령': '신비로운 존재',
    '악마': '강한 존재',
    '저주': '운명',
    
    // 부정적 감정
    '사악한': '카리스마 있는',
    '음험한': '신중한',
    '교활한': '영리한',
    '불길한': '신비로운',
    '증오': '강한 감정',
    '혐오': '거부감',
    '공포': '긴장감',
    '끔찍': '강렬한',
    '무시무시': '강렬한',
    '소름': '놀라운',
    
    // 나이/신체
    '늙은': '나이 든',
    '노인': '어르신',
    '병든': '아픈',
    
    // 기타 민감
    '음란': '매력적',
    '선정적': '매력적',
    '섹시': '매력적',
    '술': '음료',
    '담배': '물건'
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