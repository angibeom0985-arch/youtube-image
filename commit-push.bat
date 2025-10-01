@echo off
chcp 65001 >nul
echo ========================
echo 🚀 Git 커밋 & 푸시 배치 파일
echo ========================
echo.

:: 현재 브랜치 확인
echo 📍 현재 브랜치 확인:
git branch
echo.

:: git status 확인
echo 📋 변경된 파일 확인:
git status
echo.

:: 사용자에게 커밋 메시지 입력 요청
set /p commit_message="💬 커밋 메시지를 입력하세요: "

if "%commit_message%"=="" (
    echo ❌ 커밋 메시지가 입력되지 않았습니다.
    pause
    exit /b 1
)

:: git add
echo.
echo 📦 변경사항 스테이징 중...
git add .

:: git commit
echo.
echo 💾 커밋 생성 중...
git commit -m "%commit_message%"

if errorlevel 1 (
    echo ❌ 커밋에 실패했습니다. 변경사항이 없거나 오류가 발생했습니다.
    pause
    exit /b 1
)

:: git push
echo.
echo 🚀 원격 저장소에 푸시 중...
git push

if errorlevel 1 (
    echo ❌ 푸시에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo ✅ 커밋과 푸시가 성공적으로 완료되었습니다!
echo 💬 커밋 메시지: %commit_message%
echo.

:: 마지막 커밋 정보 표시
echo 📝 최근 커밋 정보:
git log --oneline -1

echo.
echo 🎉 모든 작업이 완료되었습니다!
pause