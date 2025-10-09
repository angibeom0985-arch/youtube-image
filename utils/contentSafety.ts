// 콘텐츠 정책 위반 단어 및 안전한 대체어 매핑
export const UNSAFE_WORDS_MAP: Record<string, string> = {
  // 범죄 관련
  공범: "협력자",
  범죄자: "인물",
  악역: "상대역",
  악당: "상대역",
  악인: "인물",
  범인: "인물",
  살인자: "인물",
  살인범: "인물",
  살인: "사건",
  살해: "사건",
  도둑: "인물",
  강도: "인물",
  강도질: "사건",
  범죄: "사건",
  납치: "사건",
  유괴: "사건",
  테러: "사건",
  테러범: "인물",
  암살: "사건",
  암살자: "인물",

  // 폭력 관련
  위험한: "신중한",
  위험: "조심스러운",
  무서운: "진지한",
  위협적인: "당당한",
  위협: "도전",
  잔인한: "엄격한",
  잔인: "강한",
  포악한: "강인한",
  포악: "강인함",
  폭력: "힘",
  폭력적: "강한",
  공격: "행동",
  공격적: "적극적",
  싸움: "경쟁",
  전쟁: "경쟁",
  전투: "경쟁",
  무기: "도구",
  칼: "도구",
  검: "도구",
  총: "도구",
  권총: "도구",
  폭탄: "물건",
  폭발: "사건",
  피: "붉은색",
  피가: "붉은색이",
  피를: "붉은색을",
  피범벅: "붉은색",
  피투성이: "붉은색",
  죽음: "종말",
  죽은: "고요한",
  죽이: "멈추",
  사망: "종말",
  사체: "인물",
  시체: "인물",
  고문: "심문",
  구타: "충돌",
  폭행: "충돌",
  학대: "어려움",

  // 외모/분위기 관련
  어둠: "진한 색",
  어두운: "진한 색의",
  어둡: "진한 색",
  검은: "어두운 색의",
  검정: "어두운 색",
  암흑: "진한 색",
  미스터리한: "신비로운",
  미스터리: "신비",
  수상한: "독특한",
  수상: "독특함",
  의심스러운: "신중한",
  의심: "주의",
  괴물: "독특한 존재",
  괴수: "큰 존재",
  귀신: "신비로운 존재",
  유령: "신비로운 존재",
  악마: "강한 존재",
  마귀: "강한 존재",
  악귀: "신비로운 존재",
  저주: "운명",
  저주받은: "운명적인",
  지옥: "어려운 곳",
  악몽: "꿈",

  // 부정적 감정/표현
  사악한: "카리스마 있는",
  사악: "강한 카리스마",
  음험한: "신중한",
  음험: "신중함",
  교활한: "영리한",
  교활: "영리함",
  간교한: "영리한",
  불길한: "신비로운",
  불길: "신비로움",
  흉악한: "강렬한",
  흉악: "강렬함",
  증오: "강한 감정",
  증오하: "싫어하",
  혐오: "거부감",
  혐오스: "불쾌한",
  공포: "긴장감",
  공포스: "긴장되는",
  끔찍: "강렬한",
  끔찍한: "강렬한",
  무시무시: "강렬한",
  소름: "놀라운",
  소름끼: "놀라운",
  섬뜩: "인상적",
  섬뜩한: "인상적인",
  잔혹: "강한",
  잔혹한: "강한",

  // 나이/신체 민감 표현
  늙은: "나이 든",
  노인: "어르신",
  할머니: "연세 드신 여성",
  할아버지: "연세 드신 남성",
  병든: "아픈",
  병자: "환자",
  장애: "특별한",
  장애인: "특별한 사람",
  불구: "특별한",
  추한: "독특한",
  못생긴: "독특한",

  // 기타 민감 표현
  음란: "매력적",
  음란한: "매력적인",
  선정적: "매력적",
  섹시: "매력적",
  야한: "매력적",
  나체: "인물",
  벗은: "단순한",
  벗긴: "단순한",
  술: "음료",
  술에: "음료에",
  담배: "물건",
  흡연: "휴식",
  마약: "물질",
  약물: "물질",
  자살: "종말",
  자해: "상처",
};

// 위반 단어 감지 함수 (더 정확한 감지)
export const detectUnsafeWords = (text: string): string[] => {
  const foundWords: string[] = [];

  // 긴 단어부터 먼저 검사 (부분 매칭 방지)
  const sortedWords = Object.keys(UNSAFE_WORDS_MAP).sort(
    (a, b) => b.length - a.length
  );

  sortedWords.forEach((unsafeWord) => {
    // 정규식으로 정확히 단어 매칭
    const regex = new RegExp(unsafeWord, "g");
    if (regex.test(text)) {
      foundWords.push(unsafeWord);
    }
  });

  return [...new Set(foundWords)]; // 중복 제거
};

// 안전한 단어로 자동 교체 함수 (긴 단어 우선 교체)
export const replaceUnsafeWords = (
  text: string
): {
  replacedText: string;
  replacements: Array<{ original: string; replacement: string }>;
} => {
  let replacedText = text;
  const replacements: Array<{ original: string; replacement: string }> = [];

  // 긴 단어부터 먼저 교체 (부분 교체 방지)
  const sortedEntries = Object.entries(UNSAFE_WORDS_MAP).sort(
    ([a], [b]) => b.length - a.length
  );

  sortedEntries.forEach(([unsafeWord, safeWord]) => {
    const regex = new RegExp(unsafeWord, "g");
    if (regex.test(replacedText)) {
      replacedText = replacedText.replace(regex, safeWord);
      // 중복 추가 방지
      if (!replacements.find((r) => r.original === unsafeWord)) {
        replacements.push({ original: unsafeWord, replacement: safeWord });
      }
    }
  });

  return { replacedText, replacements };
};

// 텍스트가 안전한지 확인하는 함수
export const isTextSafe = (text: string): boolean => {
  return detectUnsafeWords(text).length === 0;
};
