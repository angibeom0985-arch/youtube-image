import React, { useState, useCallback, useEffect } from "react";
import JSZip from "jszip";
import {
  Character,
  VideoSourceImage,
  AspectRatio,
  ImageStyle,
  CharacterStyle,
  BackgroundStyle,
  PhotoComposition,
} from "./types";
import * as geminiService from "./services/geminiService";
import { testApiKey } from "./services/apiTest";
import {
  detectUnsafeWords,
  replaceUnsafeWords,
  isTextSafe,
} from "./utils/contentSafety";
import {
  saveApiKey,
  loadApiKey,
  clearApiKey,
  isRememberMeEnabled,
} from "./utils/apiKeyStorage";
import Spinner from "./components/Spinner";
import CharacterCard from "./components/CharacterCard";
import StoryboardImage from "./components/StoryboardImage";
import Slider from "./components/Slider";
import MetaTags from "./components/MetaTags";
import ApiKeyGuide from "./components/ApiKeyGuide";
import UserGuide from "./components/UserGuide";
import AdBanner from "./components/AdBanner";
import FloatingBottomAd from "./components/FloatingBottomAd";
import SideFloatingAd from "./components/SideFloatingAd";
import AdBlockDetector from "./components/AdBlockDetector";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    "main" | "api-guide" | "user-guide" | "image-prompt"
  >("main");
  const [apiKey, setApiKey] = useState<string>("");
  const [rememberApiKey, setRememberApiKey] = useState<boolean>(true);
  const [imageStyle, setImageStyle] = useState<"realistic" | "animation">(
    "realistic"
  ); // 기존 이미지 스타일 (실사/애니메이션)
  const [personaStyle, setPersonaStyle] = useState<ImageStyle>("실사 극대화"); // 기존 페르소나 스타일 (호환성 유지)
  const [characterStyle, setCharacterStyle] =
    useState<CharacterStyle>("실사 극대화"); // 인물 스타일
  const [backgroundStyle, setBackgroundStyle] =
    useState<BackgroundStyle>("모던"); // 배경/분위기 스타일
  const [customCharacterStyle, setCustomCharacterStyle] = useState<string>(""); // 커스텀 인물 스타일
  const [customBackgroundStyle, setCustomBackgroundStyle] =
    useState<string>(""); // 커스텀 배경 스타일
  const [customStyle, setCustomStyle] = useState<string>(""); // 커스텀 스타일 입력 (기존 호환성)
  const [photoComposition, setPhotoComposition] =
    useState<PhotoComposition>("정면"); // 사진 구도
  const [customPrompt, setCustomPrompt] = useState<string>(""); // 커스텀 이미지 프롬프트
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9"); // 이미지 비율 선택
  const [personaInput, setPersonaInput] = useState<string>(""); // 페르소나 생성용 입력
  const [videoSourceScript, setVideoSourceScript] = useState<string>(""); // 영상 소스용 대본
  const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(false); // 자막 포함 여부 - 기본 OFF
  const [personaReferenceImage, setPersonaReferenceImage] = useState<
    string | null
  >(null); // 페르소나용 참조 이미지 (선택사항)
  const [referenceImage, setReferenceImage] = useState<string | null>(null); // 영상 소스용 참조 이미지
  const [characters, setCharacters] = useState<Character[]>([]);
  const [videoSource, setVideoSource] = useState<VideoSourceImage[]>([]);
  const [imageCount, setImageCount] = useState<number>(5);
  const [isLoadingCharacters, setIsLoadingCharacters] =
    useState<boolean>(false);
  const [isLoadingVideoSource, setIsLoadingVideoSource] =
    useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [personaError, setPersonaError] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState<{
    unsafeWords: string[];
    replacements: Array<{ original: string; replacement: string }>;
  } | null>(null);
  const [isContentWarningAcknowledged, setIsContentWarningAcknowledged] =
    useState<boolean>(false);
  const [hasContentWarning, setHasContentWarning] = useState<boolean>(false);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null); // 호버된 스타일

  // URL 기반 현재 뷰 결정 및 브라우저 네비게이션 처리
  useEffect(() => {
    const updateViewFromPath = () => {
      const path = decodeURIComponent(window.location.pathname);
      if (
        path === "/api-guide" ||
        (path.includes("api") && path.includes("가이드"))
      ) {
        setCurrentView("api-guide");
      } else if (
        path === "/user-guide" ||
        (path.includes("사용법") && path.includes("가이드"))
      ) {
        setCurrentView("user-guide");
      } else if (path === "/image-prompt") {
        setCurrentView("image-prompt");
      } else {
        setCurrentView("main");
      }
    };

    // 초기 로드 시 뷰 설정
    updateViewFromPath();

    // 브라우저 뒤로가기/앞으로가기 버튼 처리
    const handlePopState = () => {
      updateViewFromPath();
    };

    window.addEventListener("popstate", handlePopState);

    // cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // 컴포넌트 마운트 시 저장된 API 키 로딩
  useEffect(() => {
    const savedApiKey = loadApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setRememberApiKey(isRememberMeEnabled());
    }
  }, []);

  // 컴포넌트 마운트 시 저장된 작업 데이터 불러오기
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("youtube_image_work_data");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.characters) setCharacters(parsed.characters);
        if (parsed.videoSource) setVideoSource(parsed.videoSource);
        if (parsed.personaInput) setPersonaInput(parsed.personaInput);
        if (parsed.videoSourceScript)
          setVideoSourceScript(parsed.videoSourceScript);
        if (parsed.personaReferenceImage)
          setPersonaReferenceImage(parsed.personaReferenceImage);
        if (parsed.referenceImage) setReferenceImage(parsed.referenceImage);
        if (parsed.imageStyle) setImageStyle(parsed.imageStyle);
        if (parsed.characterStyle) setCharacterStyle(parsed.characterStyle);
        if (parsed.backgroundStyle) setBackgroundStyle(parsed.backgroundStyle);
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.imageCount) setImageCount(parsed.imageCount);
        if (parsed.subtitleEnabled !== undefined)
          setSubtitleEnabled(parsed.subtitleEnabled);
        console.log("작업 데이터 복원 완료");
      }
    } catch (e) {
      console.error("작업 데이터 불러오기 실패:", e);
    }
  }, []);

  // 작업 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      const dataToSave = {
        characters,
        videoSource,
        personaInput,
        videoSourceScript,
        personaReferenceImage,
        referenceImage,
        imageStyle,
        characterStyle,
        backgroundStyle,
        aspectRatio,
        imageCount,
        subtitleEnabled,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        "youtube_image_work_data",
        JSON.stringify(dataToSave)
      );
    } catch (e) {
      console.error("작업 데이터 저장 실패:", e);
    }
  }, [
    characters,
    videoSource,
    personaInput,
    videoSourceScript,
    personaReferenceImage,
    referenceImage,
    imageStyle,
    characterStyle,
    backgroundStyle,
    aspectRatio,
    imageCount,
    subtitleEnabled,
  ]);

  // 보안: 드래그, 우클릭, 캡처 방지
  useEffect(() => {
    // 입력 필드인지 확인하는 헬퍼 함수
    const isInputField = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable
      );
    };

    // 드래그, 선택, 우클릭, 복사 차단 (입력 필드 제외)
    const preventDefaultExceptInput = (e: Event) => {
      if (!isInputField(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("contextmenu", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("selectstart", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("dragstart", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("copy", preventDefaultExceptInput, {
      capture: true,
    });
    document.addEventListener("cut", preventDefaultExceptInput, {
      capture: true,
    });

    // 마우스 우클릭 차단 (드래그프리류 우회 방지, 입력 필드 제외)
    const blockRightClick = (e: MouseEvent) => {
      if (e.button === 2 && !isInputField(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("mousedown", blockRightClick, { capture: true });
    document.addEventListener("mouseup", blockRightClick, { capture: true });

    // CSS로 선택 방지 (입력 필드는 스타일로 예외 처리)
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    // 입력 필드는 선택 가능하도록 스타일 추가
    const style = document.createElement("style");
    style.textContent = `
      input, textarea, [contenteditable="true"] {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // 키보드 단축키 차단 (입력 필드에서는 편집 단축키 허용)
    const blockKeys = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput = isInputField(target);

      // 입력 필드에서는 기본 편집 단축키 허용
      // Ctrl+C (복사), Ctrl+V (붙여넣기), Ctrl+X (잘라내기), Ctrl+A (전체선택)
      // Ctrl+Z (되돌리기), Ctrl+Y (다시실행), Ctrl+Shift+Z (다시실행)
      if (isInput) {
        // 입력 필드에서 허용할 단축키
        const allowedKeys = [
          "c",
          "v",
          "x",
          "a",
          "z",
          "y",
          "C",
          "V",
          "X",
          "A",
          "Z",
          "Y",
        ];
        const key = e.key.toLowerCase();

        // Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z는 항상 허용
        if (e.ctrlKey && !e.shiftKey && (key === "z" || key === "y")) {
          return; // 이벤트 정상 진행
        }
        if (e.ctrlKey && e.shiftKey && key === "z") {
          return; // 이벤트 정상 진행
        }

        // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A는 Shift 없을 때만 허용
        if (e.ctrlKey && !e.shiftKey && allowedKeys.includes(e.key)) {
          return; // 이벤트 정상 진행 (복사/붙여넣기/잘라내기/전체선택)
        }
      }

      // 저장/인쇄/캡처 관련 키는 모든 곳에서 차단

      // Ctrl+S (페이지 저장) - 모든 곳에서 차단
      if (e.ctrlKey && !e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+P (인쇄) - 모든 곳에서 차단
      if (e.ctrlKey && !e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+S (페이지 저장/스크롤 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+C (직접 지정 캡처) - 입력 필드 제외하고 차단
      if (
        !isInput &&
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "c" || e.key === "C")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+W (창 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+D (단위영역 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+A (전체캡처) - 입력 필드 제외하고 차단
      if (
        !isInput &&
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "a" || e.key === "A")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+F (지정사이즈 캡처) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // PrintScreen 키 - 모든 곳에서 차단
      if (e.key === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();
        // 클립보드 지우기 시도
        if (navigator.clipboard) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        return false;
      }
      // Win+Shift+S (Windows 스크린샷 도구) - 모든 곳에서 차단
      if (e.shiftKey && e.metaKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // F12 (개발자 도구) - 모든 곳에서 차단
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I (개발자 도구) - 모든 곳에서 차단
      if (e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener("keydown", blockKeys, { capture: true });
    document.addEventListener("keyup", blockKeys, { capture: true });

    // 클린업
    return () => {
      document.removeEventListener("contextmenu", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("selectstart", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("dragstart", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("copy", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("cut", preventDefaultExceptInput, {
        capture: true,
      });
      document.removeEventListener("mousedown", blockRightClick, {
        capture: true,
      });
      document.removeEventListener("mouseup", blockRightClick, {
        capture: true,
      });
      document.removeEventListener("keydown", blockKeys, { capture: true });
      document.removeEventListener("keyup", blockKeys, { capture: true });
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      // 추가한 스타일 제거
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // API 키 변경 시 자동 저장
  const handleApiKeyChange = useCallback(
    (newApiKey: string) => {
      setApiKey(newApiKey);
      if (newApiKey.trim()) {
        saveApiKey(newApiKey, rememberApiKey);
      }
    },
    [rememberApiKey]
  );

  // 실시간 콘텐츠 안전성 검사
  useEffect(() => {
    const checkContent = () => {
      const textToCheck = personaInput + " " + videoSourceScript;
      const unsafeWords = detectUnsafeWords(textToCheck);

      if (unsafeWords.length > 0) {
        const { replacements } = replaceUnsafeWords(textToCheck);
        setContentWarning({ unsafeWords, replacements });
        setHasContentWarning(true);
        setIsContentWarningAcknowledged(false);
      } else {
        setContentWarning(null);
        setHasContentWarning(false);
        setIsContentWarningAcknowledged(false);
      }
    };

    const debounceTimer = setTimeout(checkContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [personaInput, videoSourceScript]);

  // Remember Me 설정 변경
  const handleRememberMeChange = useCallback(
    (remember: boolean) => {
      setRememberApiKey(remember);
      if (apiKey.trim()) {
        saveApiKey(apiKey, remember);
      }
    },
    [apiKey]
  );

  // API 키 삭제
  const handleClearApiKey = useCallback(() => {
    clearApiKey();
    setApiKey("");
    setRememberApiKey(true);
  }, []);

  // 참조 이미지 업로드 핸들러
  const handleReferenceImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 파일 타입 검증
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      // 파일 크기 검증 (최대 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError("이미지 파일 크기는 10MB를 초과할 수 없습니다.");
        return;
      }

      // 허용된 이미지 포맷 검증
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("지원되는 이미지 형식: JPG, JPEG, PNG, WEBP");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Data = result.split(",")[1]; // data:image/jpeg;base64, 부분 제거
        setReferenceImage(base64Data);
        setError(null); // 성공 시 에러 초기화
      };
      reader.onerror = () => {
        setError("이미지 파일을 읽는 중 오류가 발생했습니다.");
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // 참조 이미지 삭제 핸들러
  const handleRemoveReferenceImage = useCallback(() => {
    setReferenceImage(null);
  }, []);

  // 콘텐츠 안전성 검사 및 자동 교체 함수
  const checkAndReplaceContent = useCallback((text: string) => {
    const unsafeWords = detectUnsafeWords(text);
    if (unsafeWords.length > 0) {
      const { replacedText, replacements } = replaceUnsafeWords(text);
      setContentWarning({ unsafeWords, replacements });
      return replacedText;
    }
    setContentWarning(null);
    return text;
  }, []);

  // 안전한 단어로 자동 교체 버튼 핸들러
  const handleAutoReplace = useCallback(() => {
    if (contentWarning) {
      const { replacedText: replacedPersona } =
        replaceUnsafeWords(personaInput);
      const { replacedText: replacedScript } =
        replaceUnsafeWords(videoSourceScript);
      setPersonaInput(replacedPersona);
      setVideoSourceScript(replacedScript);
      setContentWarning(null);
      setHasContentWarning(false);
      setIsContentWarningAcknowledged(true);
    }
  }, [personaInput, videoSourceScript, contentWarning]);

  // 콘텐츠 경고 확인 핸들러
  const handleAcknowledgeWarning = useCallback(() => {
    setIsContentWarningAcknowledged(true);
  }, []);

  const handleGeneratePersonas = useCallback(async () => {
    if (!apiKey.trim()) {
      setPersonaError("Google Gemini API 키를 입력해주세요.");
      return;
    }
    if (!personaInput.trim()) {
      setPersonaError("캐릭터 설명 또는 대본을 입력해주세요.");
      return;
    }

    // 콘텐츠 안전성 검사 및 자동 교체 (강제)
    console.log("🔍 검사 시작 - 입력 텍스트:", personaInput);
    const unsafeWords = detectUnsafeWords(personaInput);
    console.log("⚠️ 감지된 위험 단어:", unsafeWords);

    let safeInput = personaInput;

    if (unsafeWords.length > 0) {
      const { replacedText, replacements } = replaceUnsafeWords(personaInput);
      safeInput = replacedText;

      console.log("✅ 교체 완료:", replacements);
      console.log("📝 교체 후 텍스트:", safeInput);

      // 사용자에게 교체 내역 알림
      const replacementList = replacements
        .map((r) => `  • "${r.original}" → "${r.replacement}"`)
        .join("\n");

      const alertMessage = `🔄 안전한 이미지 생성을 위해 다음 단어를 자동으로 교체했습니다:\n\n${replacementList}\n\n이제 안전한 텍스트로 이미지를 생성합니다.`;

      console.log("🔔 알림 표시:", alertMessage);
      alert(alertMessage);

      // 입력 필드도 안전한 텍스트로 업데이트
      setPersonaInput(safeInput);
    } else {
      console.log("✅ 안전한 단어만 사용되었습니다.");
    }

    setIsLoadingCharacters(true);
    setPersonaError(null);
    setCharacters([]);

    try {
      // Step 1: API 키 테스트
      const testResult = await testApiKey(apiKey);

      if (!testResult.success) {
        setPersonaError(`API 키 테스트 실패: ${testResult.message}`);
        setIsLoadingCharacters(false);
        return;
      }

      // Step 2: 캐릭터 생성 (페르소나용 참조 이미지 포함)
      const generatedCharacters = await geminiService.generateCharacters(
        safeInput,
        apiKey,
        imageStyle,
        aspectRatio,
        personaStyle,
        customStyle,
        photoComposition,
        customPrompt,
        characterStyle,
        backgroundStyle,
        customCharacterStyle,
        customBackgroundStyle,
        personaReferenceImage // 페르소나용 참조 이미지 전달
      );
      if (generatedCharacters.length === 0) {
        setPersonaError(
          "캐릭터 생성에 실패했습니다. 다른 캐릭터 설명으로 다시 시도해보세요."
        );
      } else {
        setCharacters(generatedCharacters);

        // 교체 정보가 있는지 확인
        const hasReplacements = generatedCharacters.some((char) =>
          char.description.includes("⚠️ 알림:")
        );

        if (hasReplacements) {
          // 교체가 있었던 경우 - 성공 메시지 (녹색)
          setPersonaError(
            `✅ ${generatedCharacters.length}개 캐릭터가 성공적으로 생성되었습니다.\n일부 단어가 안전한 표현으로 자동 교체되었습니다. 각 캐릭터 설명을 확인해주세요.`
          );
        }
        // 교체 없이 모두 성공한 경우는 에러 메시지 표시 안 함 (personaError를 null로 유지)
      }
    } catch (e) {
      console.error("캐릭터 생성 오류:", e);
      let errorMessage = "캐릭터 생성 중 오류가 발생했습니다.";

      if (e instanceof Error) {
        const message = e.message.toLowerCase();
        if (
          message.includes("content policy") ||
          message.includes("policy restrictions")
        ) {
          errorMessage =
            "콘텐츠 정책 위반으로 이미지 생성이 실패했습니다. 캐릭터 설명을 더 일반적이고 긍정적인 내용으로 수정해보세요.";
        } else if (message.includes("api") && message.includes("key")) {
          errorMessage =
            "API 키 오류입니다. 올바른 Google Gemini API 키를 입력했는지 확인해주세요.";
        } else if (
          message.includes("quota") ||
          message.includes("limit") ||
          message.includes("rate")
        ) {
          errorMessage =
            "API 사용량이 한계에 도달했습니다. 잠시 후 다시 시도해주세요.";
        } else if (message.includes("network") || message.includes("fetch")) {
          errorMessage =
            "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
        } else {
          errorMessage = `오류: ${e.message}`;
        }
      } else if (typeof e === "string") {
        errorMessage = e;
      }

      setPersonaError(errorMessage);
    } finally {
      setIsLoadingCharacters(false);
    }
  }, [
    personaInput,
    apiKey,
    imageStyle,
    aspectRatio,
    personaStyle,
    customStyle,
    photoComposition,
    customPrompt,
    personaReferenceImage,
    characterStyle,
    backgroundStyle,
    customCharacterStyle,
    customBackgroundStyle,
  ]);

  const handleRegenerateCharacter = useCallback(
    async (
      characterId: string,
      description: string,
      name: string,
      customPrompt?: string
    ) => {
      if (!apiKey.trim()) {
        setPersonaError("Google Gemini API 키를 입력해주세요.");
        return;
      }
      try {
        // 커스텀 프롬프트가 있으면 description에 추가
        const enhancedDescription = customPrompt
          ? `${description}. Additional style: ${customPrompt}`
          : description;

        const newImage = await geminiService.regenerateCharacterImage(
          enhancedDescription,
          name,
          apiKey,
          imageStyle,
          aspectRatio,
          personaStyle
        );
        setCharacters((prev) =>
          prev.map((char) =>
            char.id === characterId ? { ...char, image: newImage } : char
          )
        );
      } catch (e) {
        console.error("캐릭터 재생성 오류:", e);
        const errorMessage =
          e instanceof Error
            ? `캐릭터 이미지 재생성 실패: ${e.message}`
            : "캐릭터 이미지 재생성에 실패했습니다.";
        setPersonaError(errorMessage);
      }
    },
    [apiKey, imageStyle, aspectRatio, personaStyle]
  );

  const handleGenerateVideoSource = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Google Gemini API 키를 입력해주세요.");
      return;
    }
    if (!videoSourceScript.trim()) {
      setError("영상 소스 생성을 위한 대본을 입력해주세요.");
      return;
    }
    // 참조 이미지가 있으면 캐릭터 없이도 생성 가능
    if (characters.length === 0 && !referenceImage) {
      setError("페르소나를 먼저 생성하거나, 참조 이미지를 업로드해주세요.");
      return;
    }

    // 콘텐츠 안전성 검사 및 자동 교체
    console.log("🔍 영상 소스 - 검사 시작:", videoSourceScript);
    const unsafeWords = detectUnsafeWords(videoSourceScript);
    console.log("⚠️ 영상 소스 - 감지된 위험 단어:", unsafeWords);

    let safeScript = videoSourceScript;

    if (unsafeWords.length > 0) {
      const { replacedText, replacements } =
        replaceUnsafeWords(videoSourceScript);
      safeScript = replacedText;

      console.log("✅ 영상 소스 - 교체 완료:", replacements);
      console.log("📝 영상 소스 - 교체 후 텍스트:", safeScript);

      // 사용자에게 교체 내역 알림
      const replacementList = replacements
        .map((r) => `  • "${r.original}" → "${r.replacement}"`)
        .join("\n");

      const alertMessage = `🔄 안전한 이미지 생성을 위해 다음 단어를 자동으로 교체했습니다:\n\n${replacementList}\n\n이제 안전한 텍스트로 영상 소스를 생성합니다.`;

      console.log("🔔 영상 소스 - 알림 표시:", alertMessage);
      alert(alertMessage);

      // 입력 필드도 안전한 텍스트로 업데이트
      setVideoSourceScript(safeScript);
    } else {
      console.log("✅ 영상 소스 - 안전한 단어만 사용되었습니다.");
    }

    // 이미지 개수 제한 - 자동 조정 (함수 중단하지 않음)
    const limitedImageCount = Math.min(imageCount, 20);
    if (imageCount > 20) {
      setImageCount(20);
      // 경고는 표시하지만 생성은 계속 진행
      console.warn("이미지 개수가 20개로 자동 조정되었습니다.");
    }

    setIsLoadingVideoSource(true);
    setError(null);
    setVideoSource([]);

    try {
      // 안전한 스크립트로 생성
      const generatedVideoSource = await geminiService.generateStoryboard(
        safeScript,
        characters,
        limitedImageCount,
        apiKey,
        imageStyle,
        subtitleEnabled,
        referenceImage,
        aspectRatio
      );

      // 성공한 이미지만 필터링
      const successfulImages = generatedVideoSource.filter(
        (item) => item.image && item.image.trim() !== ""
      );
      const failedCount = generatedVideoSource.length - successfulImages.length;

      setVideoSource(successfulImages);

      if (failedCount > 0) {
        setError(
          `${successfulImages.length}개의 이미지가 생성되었습니다. ${failedCount}개는 생성에 실패했습니다. 대본을 수정하거나 다시 시도해보세요.`
        );
      } else if (successfulImages.length === 0) {
        setError(
          "모든 이미지 생성에 실패했습니다. API 키를 확인하거나 대본을 수정한 후 다시 시도해보세요."
        );
      }
    } catch (e) {
      console.error("영상 소스 생성 오류:", e);
      let errorMessage = "영상 소스 생성 중 알 수 없는 오류가 발생했습니다.";

      if (e instanceof Error) {
        const message = e.message.toLowerCase();
        if (message.includes("api")) {
          errorMessage =
            "API 호출에 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해보세요.";
        } else if (
          message.includes("quota") ||
          message.includes("limit") ||
          message.includes("rate")
        ) {
          errorMessage =
            "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 이미지 개수를 줄여보세요.";
        } else if (message.includes("network") || message.includes("fetch")) {
          errorMessage =
            "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
        } else {
          errorMessage = `오류: ${e.message}`;
        }
      } else if (typeof e === "string") {
        errorMessage = e;
      }

      setError(errorMessage);
    } finally {
      setIsLoadingVideoSource(false);
    }
  }, [
    videoSourceScript,
    characters,
    imageCount,
    apiKey,
    imageStyle,
    subtitleEnabled,
    referenceImage,
    aspectRatio,
  ]);

  const handleRegenerateVideoSourceImage = useCallback(
    async (videoSourceItemId: string, customPrompt?: string) => {
      if (!apiKey.trim()) {
        setError("Google Gemini API 키를 입력해주세요.");
        return;
      }
      const itemToRegenerate = videoSource.find(
        (item) => item.id === videoSourceItemId
      );
      if (!itemToRegenerate) return;

      try {
        // 커스텀 프롬프트가 있으면 장면 설명에 추가
        const enhancedDescription = customPrompt
          ? `${itemToRegenerate.sceneDescription}. Additional style: ${customPrompt}`
          : itemToRegenerate.sceneDescription;

        const newImage = await geminiService.regenerateStoryboardImage(
          enhancedDescription,
          characters,
          apiKey,
          imageStyle,
          subtitleEnabled,
          referenceImage,
          aspectRatio
        );
        setVideoSource((prev) =>
          prev.map((item) =>
            item.id === videoSourceItemId ? { ...item, image: newImage } : item
          )
        );
      } catch (e) {
        console.error("영상 소스 재생성 오류:", e);
        const errorMessage =
          e instanceof Error
            ? `영상 소스 이미지 재생성 실패: ${e.message}`
            : "영상 소스 이미지 재생성에 실패했습니다.";
        setError(errorMessage);
      }
    },
    [
      videoSource,
      characters,
      apiKey,
      imageStyle,
      subtitleEnabled,
      referenceImage,
      aspectRatio,
    ]
  );

  // 쿠팡파트너스 링크 랜덤 선택 함수
  const openRandomCoupangLink = () => {
    const coupangLinks = [
      "https://link.coupang.com/a/cT5vZN",
      "https://link.coupang.com/a/cT5v5P",
      "https://link.coupang.com/a/cT5v8V",
      "https://link.coupang.com/a/cT5wcC",
      "https://link.coupang.com/a/cT5wgX",
    ];

    const randomLink =
      coupangLinks[Math.floor(Math.random() * coupangLinks.length)];
    window.open(randomLink, "_blank", "noopener,noreferrer");
  };

  // 모든 작업 데이터 초기화
  const handleResetAll = useCallback(() => {
    const confirmReset = window.confirm(
      "⚠️ 모든 작업 데이터가 삭제됩니다.\n\n생성된 페르소나, 영상 소스, 입력 내용이 모두 초기화됩니다.\n\n정말 초기화하시겠습니까?"
    );

    if (confirmReset) {
      // 상태 초기화
      setCharacters([]);
      setVideoSource([]);
      setPersonaInput("");
      setVideoSourceScript("");
      setPersonaReferenceImage(null);
      setReferenceImage(null);
      setImageStyle("realistic");
      setCharacterStyle("실사 극대화");
      setBackgroundStyle("모던");
      setAspectRatio("16:9");
      setImageCount(5);
      setSubtitleEnabled(false);
      setCustomPrompt("");
      setError(null);
      setPersonaError(null);
      setContentWarning(null);
      setIsContentWarningAcknowledged(false);
      setHasContentWarning(false);

      // localStorage 데이터 삭제
      localStorage.removeItem("youtube_image_work_data");

      console.log("모든 작업 데이터가 초기화되었습니다.");

      // 성공 알림
      window.alert("✅ 초기화 완료!\n\n새로운 작업을 시작할 수 있습니다.");
    }
  }, []);

  const handleDownloadAllImages = useCallback(async () => {
    if (videoSource.length === 0) return;

    // 다운로드 시작 전에 쿠팡 링크 열기
    openRandomCoupangLink();

    setIsDownloading(true);
    setError(null);
    try {
      const zip = new JSZip();
      videoSource.forEach((item, index) => {
        const safeDescription = item.sceneDescription
          .replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_")
          .substring(0, 30);
        const fileName = `scene_${index + 1}_${safeDescription}.jpeg`;
        zip.file(fileName, item.image, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "video_sources.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      // 다운로드 완료 후 안내 팝업 표시
      window
        .open("", "", "width=320,height=180")
        .document.write(
          '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>알림</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;background:#18181b;color:#fff;}</style></head><body>모든 이미지가 저장되었습니다.</body></html>'
        );
    } catch (e) {
      console.error("Failed to create zip file:", e);
      const errorMessage =
        e instanceof Error
          ? `ZIP 파일 생성 실패: ${e.message}`
          : "ZIP 파일 다운로드에 실패했습니다.";
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  }, [videoSource]);

  // 라우팅 처리
  if (currentView === "api-guide") {
    return (
      <>
        <MetaTags
          title="API 발급 가이드 - 유튜브 롱폼 이미지 생성기"
          description="Google Gemini API 키 발급 방법을 단계별로 안내합니다. 무료로 유튜브 콘텐츠용 AI 이미지를 생성하세요."
          url="https://youtube-image.money-hotissue.com/api_발급_가이드"
          image="/api-guide-preview.png"
          type="article"
        />
        <ApiKeyGuide
          onBack={() => {
            setCurrentView("main");
            window.history.pushState({}, "", "/");
          }}
        />
      </>
    );
  }

  if (currentView === "user-guide") {
    return (
      <>
        <MetaTags
          title="유튜브 이미지 생성기 사용법 가이드 - AI로 콘텐츠 제작하기"
          description="AI를 활용하여 유튜브 페르소나와 영상 소스를 생성하는 방법을 상세히 알려드립니다. 단계별 가이드로 쉽게 따라하세요."
          url="https://youtube-image.money-hotissue.com/유튜브_이미지_생성기_사용법_가이드"
          image="/user-guide-preview.png"
          type="article"
        />
        <UserGuide
          onBack={() => {
            setCurrentView("main");
            window.history.pushState({}, "", "/");
          }}
          onNavigate={(view) => {
            if (view === "api-guide") {
              setCurrentView("api-guide");
              window.history.pushState({}, "", "/api-guide");
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <AdBlockDetector />
      <MetaTags
        title="유튜브 롱폼 이미지 생성기 - AI로 캐릭터와 스토리보드 만들기"
        description="Google Gemini AI를 활용해 유튜브 콘텐츠용 페르소나와 영상 소스를 쉽고 빠르게 생성하세요. 다양한 비율(9:16, 16:9, 1:1) 지원."
        url="https://youtube-image.money-hotissue.com"
        image="/og-image.png"
        type="website"
      />
      <SideFloatingAd side="left" />
      <SideFloatingAd side="right" />
      <div
        className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8"
        style={{ paddingBottom: "120px" }}
      >
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              유튜브 롱폼 이미지 생성기
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              스크립트를 입력하고 일관된 캐릭터와 영상 소스 이미지를 생성하세요!
            </p>

            {/* 네비게이션 링크 */}
            <div className="flex justify-center mt-4 space-x-4">
              <button
                onClick={() => {
                  setCurrentView("api-guide");
                  window.history.pushState({}, "", "/api-guide");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                📚 API 키 발급 가이드
              </button>
              <button
                onClick={() => {
                  setCurrentView("user-guide");
                  window.history.pushState({}, "", "/user-guide");
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                📖 사용법 가이드
              </button>
            </div>
          </header>

          <main className="space-y-6">
            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-600">
              <h2 className="text-2xl font-bold mb-4 text-blue-300 flex items-center">
                <span className="mr-2">1️⃣</span>
                API 키 입력
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Google Gemini API 키를 입력하세요..."
                    className="flex-1 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                  <button
                    onClick={() => {
                      setCurrentView("api-guide");
                      window.history.pushState({}, "", "/api-guide");
                    }}
                    className="px-4 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    📚 발급 방법
                  </button>
                </div>

                {/* API 키 저장 옵션 */}
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-gray-300">
                      <input
                        type="checkbox"
                        checked={rememberApiKey}
                        onChange={(e) =>
                          handleRememberMeChange(e.target.checked)
                        }
                        className="mr-2 w-4 h-4 text-green-600 bg-gray-900 border-gray-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm">
                        <strong className="text-green-400">
                          ✅ API 키 기억하기
                        </strong>
                        <span className="text-gray-400 text-xs ml-1 block">
                          {rememberApiKey
                            ? "브라우저에 암호화 저장됨"
                            : "탭 닫으면 삭제됨"}
                        </span>
                      </span>
                    </label>

                    {apiKey && (
                      <button
                        onClick={handleClearApiKey}
                        className="text-red-400 hover:text-red-300 text-sm underline"
                      >
                        저장된 키 삭제
                      </button>
                    )}
                  </div>
                </div>

                {/* 보안 안내 */}
                <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-500 text-lg flex-shrink-0">
                      🔒
                    </span>
                    <div className="text-sm space-y-1">
                      <p className="text-amber-400 font-semibold">보안 안내</p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        • API 키는{" "}
                        {rememberApiKey
                          ? "암호화되어 브라우저에만"
                          : "현재 세션에만"}{" "}
                        저장되며, 외부 서버로 전송되지 않습니다
                        <br />
                        • 공용 컴퓨터를 사용하는 경우 "기억하기"를 체크하지
                        마세요
                        <br />• API 키가 유출된 경우 즉시 Google AI Studio에서
                        재발급 받으세요
                      </p>
                    </div>
                  </div>
                </div>

                {/* API 비용 안내 */}
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 text-lg flex-shrink-0">
                      💰
                    </span>
                    <div className="text-sm space-y-1">
                      <p className="text-blue-400 font-semibold">
                        API 비용 안내
                      </p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        • Gemini API 무료 등급에서 이미지 생성 기능 제공
                        <br />•{" "}
                        <span className="text-blue-400 font-semibold">
                          분당 15회 요청
                        </span>{" "}
                        제한만 있고, 결제나 비용 발생 없음
                        <br />• 분당 요청 수만 지키면{" "}
                        <span className="text-blue-400 font-semibold">
                          무료
                        </span>
                        로 사용 가능
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 광고 1: API 키와 페르소나 생성 사이 */}
            <AdBanner />

            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-purple-300 flex items-center">
                <span className="mr-2">2️⃣</span>
                페르소나 생성
              </h2>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">
                  구체적인 인물 묘사를 입력하거나, 대본을 넣으면 등장인물들을
                  자동으로 분석하여 생성합니다.
                </p>
                <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4 mb-4">
                  <p className="text-purple-200 text-sm mb-2">
                    <strong>입력 예시:</strong>
                  </p>
                  <ul className="text-purple-300 text-sm space-y-1 ml-4">
                    <li>
                      • <strong>인물 묘사:</strong> "20대 중반 여성, 긴 흑발,
                      밝은 미소, 캐주얼한 옷차림"
                    </li>
                    <li>
                      • <strong>대본 입력:</strong> 전체 스토리 대본을 넣으면
                      등장인물 자동 추출
                    </li>
                  </ul>
                </div>
              </div>
              <textarea
                value={personaInput}
                onChange={(e) => setPersonaInput(e.target.value)}
                placeholder="인물 묘사나 대본을 입력하세요..."
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-y mb-6"
              />

              {/* 이미지 스타일 선택 */}
              <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                <h3 className="text-purple-300 font-medium mb-6 flex items-center">
                  <span className="mr-2">🎨</span>
                  이미지 스타일 선택
                </h3>

                {/* 인물 스타일 */}
                <div className="mb-6">
                  <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                    <span className="mr-2">👤</span>
                    인물 스타일
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "실사 극대화",
                        "애니메이션",
                        "동물",
                        "1980년대",
                        "2000년대",
                      ] as CharacterStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<CharacterStyle, string> =
                        {
                          "실사 극대화":
                            "📸 초현실적이고 사진 같은 퀄리티의 실사 인물",
                          애니메이션: "🎨 밝고 화려한 애니메이션 스타일 캐릭터",
                          동물: "🐾 귀여운 동물 캐릭터로 변환",
                          "1980년대": "💫 80년대 패션과 헤어스타일",
                          "2000년대": "📱 2000년대 초반 패션과 스타일",
                          custom: "",
                        };

                      return (
                        <div key={style} className="relative group">
                          <button
                            onClick={() => setCharacterStyle(style)}
                            onMouseEnter={() =>
                              setHoveredStyle(`character-${style}`)
                            }
                            onMouseLeave={() => setHoveredStyle(null)}
                            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                              characterStyle === style
                                ? "bg-purple-600 text-white shadow-lg scale-105"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                            }`}
                          >
                            {style}
                          </button>
                          {hoveredStyle === `character-${style}` && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                              <div className="bg-gray-900 rounded-lg shadow-2xl border border-purple-500/50 overflow-hidden">
                                <div className="p-2">
                                  <div className="text-purple-200 font-medium text-xs mb-2 text-center">
                                    {style} 미리보기
                                  </div>
                                  <img
                                    src={`/${style}.png`}
                                    alt={`${style} 스타일 미리보기`}
                                    className="w-48 h-32 object-cover rounded"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (parent) {
                                        const fallback =
                                          document.createElement("div");
                                        fallback.className =
                                          "w-48 h-32 bg-gray-800 rounded flex items-center justify-center text-purple-300 text-sm text-center p-2";
                                        fallback.textContent =
                                          styleDescriptions[style];
                                        parent.appendChild(fallback);
                                      }
                                    }}
                                  />
                                  <div className="text-gray-300 text-xs mt-2 text-center px-2">
                                    {styleDescriptions[style]}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setCharacterStyle("custom")}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                        characterStyle === "custom"
                          ? "bg-purple-600 text-white shadow-lg scale-105"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      직접 입력
                    </button>
                  </div>
                  {characterStyle === "custom" && (
                    <input
                      type="text"
                      value={customCharacterStyle}
                      onChange={(e) => setCustomCharacterStyle(e.target.value)}
                      placeholder="원하는 인물 스타일을 입력하세요 (예: 르네상스, 빅토리아 시대 등)"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors mt-3"
                    />
                  )}
                </div>

                {/* 배경/분위기 스타일 */}
                <div>
                  <h4 className="text-purple-200 font-medium mb-3 flex items-center text-sm">
                    <span className="mr-2">🌆</span>
                    배경/분위기 스타일
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                    {(
                      [
                        "감성 멜로",
                        "서부극",
                        "공포 스릴러",
                        "사이버펑크",
                        "판타지",
                        "미니멀",
                        "빈티지",
                        "모던",
                        "먹방",
                        "귀여움",
                        "AI",
                        "괴이함",
                        "창의적인",
                      ] as BackgroundStyle[]
                    ).map((style) => {
                      const styleDescriptions: Record<BackgroundStyle, string> =
                        {
                          "감성 멜로": "🌸 로맨틱하고 감성적인 따뜻한 분위기",
                          서부극: "🤠 거친 사막과 카우보이 배경",
                          "공포 스릴러": "🎭 미스터리하고 긴장감 있는 분위기",
                          사이버펑크: "🌃 네온사인 가득한 미래 도시",
                          판타지: "🧙‍♂️ 마법적이고 신비로운 중세 배경",
                          미니멀: "⚪ 깔끔하고 단순한 중성톤 배경",
                          빈티지: "📷 클래식하고 향수를 자아내는 배경",
                          모던: "🏢 현대적이고 세련된 도시 배경",
                          먹방: "🍽️ 맛있는 음식이 가득한 먹방 분위기",
                          귀여움: "🎀 귀엽고 사랑스러운 파스텔 감성",
                          AI: "🤖 미래지향적인 하이테크 AI 분위기",
                          괴이함: "👁️ 독특하고 초현실적인 기묘한 분위기",
                          창의적인: "🎨 상상력 넘치는 독창적인 예술 분위기",
                          custom: "",
                        };

                      return (
                        <div key={style} className="relative group">
                          <button
                            onClick={() => setBackgroundStyle(style)}
                            onMouseEnter={() =>
                              setHoveredStyle(`background-${style}`)
                            }
                            onMouseLeave={() => setHoveredStyle(null)}
                            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                              backgroundStyle === style
                                ? "bg-purple-600 text-white shadow-lg scale-105"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                            }`}
                          >
                            {style}
                          </button>
                          {hoveredStyle === `background-${style}` && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                              <div className="bg-gray-900 rounded-lg shadow-2xl border border-purple-500/50 overflow-hidden">
                                <div className="p-2">
                                  <div className="text-purple-200 font-medium text-xs mb-2 text-center">
                                    {style} 미리보기
                                  </div>
                                  <img
                                    src={`/${
                                      style === "AI" ? "ai" : style
                                    }.png`}
                                    alt={`${style} 스타일 미리보기`}
                                    className="w-48 h-32 object-cover rounded"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (parent) {
                                        const fallback =
                                          document.createElement("div");
                                        fallback.className =
                                          "w-48 h-32 bg-gray-800 rounded flex items-center justify-center text-purple-300 text-sm text-center p-2";
                                        fallback.textContent =
                                          styleDescriptions[style];
                                        parent.appendChild(fallback);
                                      }
                                    }}
                                  />
                                  <div className="text-gray-300 text-xs mt-2 text-center px-2">
                                    {styleDescriptions[style]}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setBackgroundStyle("custom")}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                        backgroundStyle === "custom"
                          ? "bg-purple-600 text-white shadow-lg scale-105"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      직접 입력
                    </button>
                  </div>
                  {backgroundStyle === "custom" && (
                    <input
                      type="text"
                      value={customBackgroundStyle}
                      onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                      placeholder="원하는 배경/분위기를 입력하세요 (예: 우주 정거장, 열대 해변 등)"
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors mt-3"
                    />
                  )}
                </div>
              </div>

              {/* 사진 설정 (구도 및 비율) */}
              <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                <h3 className="text-purple-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">📐</span>
                  사진 설정
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 왼쪽: 사진 구도 선택 */}
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      사진 구도
                    </label>
                    <select
                      value={photoComposition}
                      onChange={(e) =>
                        setPhotoComposition(e.target.value as PhotoComposition)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white"
                    >
                      <option value="정면">정면 (기본)</option>
                      <option value="측면">측면</option>
                      <option value="반측면">반측면</option>
                      <option value="위에서">위에서</option>
                      <option value="아래에서">아래에서</option>
                      <option value="전신">전신</option>
                      <option value="상반신">상반신</option>
                      <option value="클로즈업">클로즈업</option>
                    </select>
                  </div>

                  {/* 오른쪽: 이미지 비율 선택 */}
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      이미지 비율
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) =>
                        setAspectRatio(e.target.value as AspectRatio)
                      }
                      className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white"
                    >
                      <option value="9:16">📱 9:16 - 모바일 세로</option>
                      <option value="16:9">🖥️ 16:9 - 데스크톱 가로</option>
                      <option value="1:1">⬜ 1:1 - 정사각형</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-3">
                  💡 사진 구도와 이미지 비율을 조합하여 원하는 스타일의 이미지를
                  만드세요.
                </div>
              </div>

              {/* 스타일 참조 이미지 업로드 (선택사항) */}
              <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                <h3 className="text-purple-300 font-medium mb-4 flex items-center">
                  <span className="mr-2">🖼️</span>
                  스타일 참조 이미지 (선택사항)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  원하는 스타일의 사진을 업로드하면 해당 스타일을 참고하여
                  페르소나를 생성합니다.
                </p>

                {!personaReferenceImage ? (
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-purple-500 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-900/10 transition-all">
                      <div className="text-purple-300 text-4xl mb-3">📷</div>
                      <p className="text-purple-200 font-medium mb-1">
                        참조 이미지 업로드
                      </p>
                      <p className="text-gray-400 text-sm">
                        클릭하여 이미지 선택 (JPG, PNG)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = (
                                event.target?.result as string
                              ).split(",")[1];
                              setPersonaReferenceImage(base64);
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error("이미지 로드 실패:", error);
                            setError("이미지를 불러오는데 실패했습니다.");
                          }
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${personaReferenceImage}`}
                      alt="참조 이미지"
                      className="w-full max-h-64 object-contain rounded-lg border-2 border-purple-500"
                    />
                    <button
                      onClick={() => setPersonaReferenceImage(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✕ 삭제
                    </button>
                    <p className="text-green-400 text-sm mt-2 flex items-center">
                      <span className="mr-2">✅</span>
                      참조 이미지가 업로드되었습니다
                    </p>
                  </div>
                )}
              </div>

              {/* 커스텀 프롬프트 (선택사항) */}
              <div className="mb-6 bg-purple-900/20 border border-purple-500/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-purple-300 font-medium flex items-center">
                    <span className="mr-2">⚡</span>
                    커스텀 이미지 프롬프트 (선택사항)
                  </h3>
                  <button
                    onClick={() => {
                      setCurrentView("image-prompt");
                      window.history.pushState({}, "", "/image-prompt");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 flex items-center"
                  >
                    <span className="mr-2">🎯</span>
                    내가 원하는 이미지 200% 뽑는 노하우
                  </button>
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="고급 사용자용: AI에게 전달할 구체적인 이미지 프롬프트를 직접 입력하세요 (영어 권장)"
                  className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-y"
                />
                <p className="text-gray-400 text-xs mt-2">
                  💡 이 필드는 고급 사용자를 위한 기능입니다. 비워두면 자동으로
                  최적화된 프롬프트가 생성됩니다.
                </p>
              </div>

              {/* 콘텐츠 정책 위반 경고 */}
              {contentWarning && !isContentWarningAcknowledged && (
                <div className="mt-4 bg-orange-900/50 border border-orange-500 text-orange-300 p-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-orange-400 text-xl mr-3">⚠️</span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        콘텐츠 정책 위반 가능성이 있는 단어가 감지되었습니다
                      </p>
                      <div className="mb-3">
                        <p className="text-sm text-orange-200 mb-2">
                          감지된 단어:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {contentWarning.unsafeWords.map((word, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-orange-800/50 rounded text-sm"
                            >
                              "{word}"
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleAutoReplace}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          🔄 안전한 단어로 자동 교체
                        </button>
                        <button
                          onClick={handleAcknowledgeWarning}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          확인하고 계속
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGeneratePersonas}
                disabled={
                  isLoadingCharacters ||
                  !personaInput.trim() ||
                  !apiKey.trim() ||
                  (hasContentWarning && !isContentWarningAcknowledged)
                }
                className="mt-4 w-full sm:w-auto px-6 py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                {isLoadingCharacters ? (
                  <>
                    <Spinner size="sm" />{" "}
                    <span className="ml-2">페르소나 생성 중...</span>
                  </>
                ) : (
                  "페르소나 생성"
                )}
              </button>
            </section>

            {/* 페르소나 생성 관련 오류/성공 메시지 표시 */}
            {personaError && (
              <div
                className={
                  personaError.startsWith("✅")
                    ? "bg-green-900/50 border border-green-500 text-green-300 p-4 rounded-lg"
                    : "bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg"
                }
              >
                <div className="flex items-start">
                  <span
                    className={
                      personaError.startsWith("✅")
                        ? "text-green-400 text-xl mr-3"
                        : "text-red-400 text-xl mr-3"
                    }
                  >
                    {personaError.startsWith("✅") ? "✅" : "⚠️"}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">{personaError}</p>
                    {/* 성공 메시지가 아닌 경우에만 해결 방법 표시 */}
                    {!personaError.startsWith("✅") && (
                      <>
                        {personaError.includes("content policy") ||
                        personaError.includes("policy restrictions") ? (
                          <div className="bg-red-800/30 rounded p-3 mt-2">
                            <p className="text-sm text-red-200 mb-2">
                              <strong>해결 방법:</strong>
                            </p>
                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                              <li>
                                • 캐릭터 이름을 더 일반적으로 변경 (예:
                                "미스터리한 공범" → "신비로운 인물")
                              </li>
                              <li>• 폭력적이거나 선정적인 표현 제거</li>
                              <li>• 긍정적이고 건전한 캐릭터로 수정</li>
                            </ul>
                          </div>
                        ) : personaError.includes("API 키") ? (
                          <div className="bg-red-800/30 rounded p-3 mt-2">
                            <p className="text-sm text-red-200 mb-2">
                              <strong>API 키 문제 해결:</strong>
                            </p>
                            <ul className="text-sm text-red-300 space-y-1 ml-4">
                              <li>• API 키가 정확히 입력되었는지 확인</li>
                              <li>• Google AI Studio에서 새 API 키 발급</li>
                              <li>• API 키에 Gemini 사용 권한이 있는지 확인</li>
                            </ul>
                          </div>
                        ) : null}
                      </>
                    )}
                    <button
                      onClick={() => setPersonaError(null)}
                      className={
                        personaError.startsWith("✅")
                          ? "mt-3 text-green-400 hover:text-green-300 text-sm underline"
                          : "mt-3 text-red-400 hover:text-red-300 text-sm underline"
                      }
                    >
                      오류 메시지 닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingCharacters && (
              <div className="text-center p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-400">
                  등장인물을 분석하고 이미지를 생성하고 있습니다... 잠시만
                  기다려 주세요.
                </p>
              </div>
            )}

            {characters.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">
                  생성된 페르소나
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {characters.map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onRegenerate={handleRegenerateCharacter}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 광고 2: 페르소나 생성과 영상 소스 생성 사이 */}
            <AdBanner />

            {/* 3단계는 항상 표시 */}
            <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-green-300 flex items-center">
                <span className="mr-2">3️⃣</span>
                영상 소스 생성
              </h2>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">
                  {referenceImage
                    ? "참조 이미지를 기반으로 영상 소스를 생성합니다. 페르소나 생성 없이 바로 진행 가능합니다."
                    : "위에서 생성한 페르소나를 활용하여 영상 소스를 만듭니다."}{" "}
                  대본 또는 시퀀스별 장면을 입력해주세요.
                </p>
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <p className="text-green-200 text-sm mb-2">
                    <strong>입력 방법:</strong>
                  </p>
                  <ul className="text-green-300 text-sm space-y-1 ml-4">
                    <li>
                      • <strong>전체 대본:</strong> 완전한 스크립트나 스토리를
                      입력
                    </li>
                    <li>
                      • <strong>시퀀스별 장면:</strong> 각 줄에 하나씩 장면
                      설명을 입력
                    </li>
                  </ul>
                </div>
              </div>

              {/* 일관성 유지 (선택사항) - 영상 소스 생성으로 이동 */}
              <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-6">
                <h3 className="text-green-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">🎨</span>
                  일관성 유지 (선택사항)
                </h3>
                <p className="text-green-200 text-sm mb-3">
                  참조 이미지를 업로드하면 해당 이미지의 스타일과 일관성을
                  유지하며 영상 소스를 생성합니다.
                  {!referenceImage &&
                    " 참조 이미지가 있으면 페르소나 생성 없이도 바로 영상 소스를 만들 수 있습니다!"}
                </p>

                {!referenceImage ? (
                  <div className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceImageUpload}
                      className="hidden"
                      id="referenceImageInput"
                    />
                    <label
                      htmlFor="referenceImageInput"
                      className="cursor-pointer flex flex-col items-center space-y-2 hover:text-green-300 transition-colors"
                    >
                      <div className="text-3xl">📸</div>
                      <div className="text-green-300 font-medium">
                        참조 이미지 업로드
                      </div>
                      <div className="text-green-400 text-sm">
                        클릭하여 이미지를 선택하세요
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={`data:image/jpeg;base64,${referenceImage}`}
                        alt="참조 이미지"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="text-green-300 font-medium">
                          참조 이미지 업로드됨
                        </div>
                        <div className="text-green-400 text-sm">
                          이 이미지의 스타일을 참고하여 영상 소스를 생성합니다
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveReferenceImage}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                value={videoSourceScript}
                onChange={(e) => setVideoSourceScript(e.target.value)}
                placeholder="대본 전체를 넣으세요. 또는 시퀀스별 원하는 장면을 넣으세요.

예시:
1. 미래 도시 옥상에서 로봇이 새벽을 바라보며 서 있는 장면
2. 공중정원에서 홀로그램 나비들이 춤추는 모습  
3. 네온사인이 반사된 빗속 거리를 걸어가는 사이보그
4. 우주 정거장 창문 너머로 지구를 내려다보는 장면"
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-y mb-4"
              />

              {/* 생성 옵션 설정 */}
              <div className="mb-4 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                <h3 className="text-green-300 font-medium mb-3 flex items-center">
                  <span className="mr-2">⚙️</span>
                  생성 옵션 설정
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 자막 설정 */}
                  <div>
                    <label className="block text-sm font-medium text-green-200 mb-2">
                      💬 자막 설정
                    </label>
                    <select
                      value={subtitleEnabled ? "on" : "off"}
                      onChange={(e) =>
                        setSubtitleEnabled(e.target.value === "on")
                      }
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-green-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="off">🚫 자막 OFF (기본값)</option>
                      <option value="on">📝 자막 ON</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      자막 포함 여부를 선택하세요
                    </p>
                  </div>

                  {/* 이미지 수 설정 */}
                  <div>
                    <Slider
                      label="생성할 이미지 수"
                      min={5}
                      max={20}
                      value={Math.min(imageCount, 20)}
                      onChange={(e) => setImageCount(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      안정적인 생성을 위해 최대 20개로 제한
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleGenerateVideoSource}
                  disabled={
                    isLoadingVideoSource ||
                    !videoSourceScript.trim() ||
                    !apiKey.trim() ||
                    (hasContentWarning && !isContentWarningAcknowledged) ||
                    (characters.length === 0 && !referenceImage)
                  }
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  {isLoadingVideoSource ? (
                    <>
                      <Spinner size="sm" />{" "}
                      <span className="ml-2">영상 소스 생성 중...</span>
                    </>
                  ) : (
                    "영상 소스 생성"
                  )}
                </button>
              </div>
            </section>

            {/* 영상 소스 생성 관련 오류 표시 */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
                <div className="flex items-start">
                  <span className="text-red-400 text-xl mr-3">⚠️</span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">{error}</p>
                    {error.includes("content policy") ||
                    error.includes("policy restrictions") ? (
                      <div className="bg-red-800/30 rounded p-3 mt-2">
                        <p className="text-sm text-red-200 mb-2">
                          <strong>해결 방법:</strong>
                        </p>
                        <ul className="text-sm text-red-300 space-y-1 ml-4">
                          <li>• 대본 내용을 더 일반적이고 긍정적으로 수정</li>
                          <li>• 폭력적이거나 선정적인 장면 제거</li>
                          <li>• 더 건전하고 긍정적인 내용으로 수정</li>
                          <li>• 구체적인 장면 설명에 집중</li>
                        </ul>
                      </div>
                    ) : error.includes("API 키") ? (
                      <div className="bg-red-800/30 rounded p-3 mt-2">
                        <p className="text-sm text-red-200 mb-2">
                          <strong>API 키 문제 해결:</strong>
                        </p>
                        <ul className="text-sm text-red-300 space-y-1 ml-4">
                          <li>• API 키가 정확히 입력되었는지 확인</li>
                          <li>• Google AI Studio에서 새 API 키 발급</li>
                          <li>• API 키에 Gemini 사용 권한이 있는지 확인</li>
                        </ul>
                      </div>
                    ) : error.includes("quota") || error.includes("limit") ? (
                      <div className="bg-red-800/30 rounded p-3 mt-2">
                        <p className="text-sm text-red-200 mb-2">
                          <strong>해결 방법:</strong>
                        </p>
                        <ul className="text-sm text-red-300 space-y-1 ml-4">
                          <li>• 5-10분 후 다시 시도</li>
                          <li>• 한 번에 생성할 이미지 수를 줄여보세요</li>
                          <li>• Google Cloud Console에서 할당량 확인</li>
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {isLoadingVideoSource && (
              <div className="text-center p-8">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-400">
                  장면을 만들고 있습니다... 이 작업은 시간이 걸릴 수 있습니다.
                </p>
              </div>
            )}

            {videoSource.length > 0 && (
              <section>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-indigo-300">
                    생성된 영상 소스
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateVideoSource}
                      disabled={
                        isLoadingVideoSource ||
                        !videoSourceScript.trim() ||
                        !apiKey.trim() ||
                        (hasContentWarning && !isContentWarningAcknowledged)
                      }
                      className="px-4 py-2 bg-blue-600 font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                    >
                      {isLoadingVideoSource ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">생성 중...</span>
                        </>
                      ) : (
                        "한 번 더 생성"
                      )}
                    </button>
                    <button
                      onClick={handleDownloadAllImages}
                      disabled={isDownloading}
                      className="px-4 py-2 bg-green-600 font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                    >
                      {isDownloading ? (
                        <>
                          <Spinner size="sm" />
                          <span className="ml-2">압축 중...</span>
                        </>
                      ) : (
                        "모든 이미지 저장"
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videoSource.map((item) => (
                    <StoryboardImage
                      key={item.id}
                      item={item}
                      onRegenerate={handleRegenerateVideoSourceImage}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="my-8">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-bold mb-2">
                  🎬 더 많은 영상 제작 도구가 필요하신가요?
                </h3>
                <p className="mb-4">
                  프로페셔널한 영상 편집과 효과를 위한 도구들을 확인해보세요!
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="https://youtube-analyze.money-hotissue.com"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    📈 떡상한 대본 1분 카피
                  </a>
                  <a
                    href="https://aimusic.money-hotissue.com/"
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    🎵 AI 음악 가사 1초 완성
                  </a>
                  <a
                    href="https://aimusic.money-hotissue.com/"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 transition-all shadow-md hover:shadow-xl cursor-pointer"
                  >
                    🎨 AI 음악 썸네일 제작
                  </a>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="mt-16 py-8 border-t border-gray-700">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center space-y-4">
                {/* 쿠팡 파트너스 공지 */}
                <p className="text-gray-400 text-sm">
                  "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
                  제공받습니다."
                </p>

                {/* 저작권 표시 */}
                <p className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} 유튜브 롱폼 이미지 생성기. All
                  rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <FloatingBottomAd />

      {/* 초기화 버튼 - 오른쪽 하단 고정 */}
      <button
        onClick={handleResetAll}
        className="fixed bottom-24 right-6 z-[10000] px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2 border-2 border-red-500"
        title="모든 작업 데이터 초기화"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
        초기화
      </button>
    </>
  );
};

export default App;
