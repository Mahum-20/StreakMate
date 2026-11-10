@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        StreakMate - Automated Android APK Builder
echo ========================================================
echo.

rem Create output directory for the compiled APK
if not exist "builds" (
    mkdir "builds"
)

echo [1/3] Verifying Expo / EAS authentication...
call npx eas-cli whoami
if %ERRORLEVEL% neq 0 (
    echo.
    echo Not authenticated yet. Opening Expo login:
    call npx eas-cli login
) else (
    echo.
    echo [OK] Authenticated with EAS!
)

echo.
echo [2/3] Compiling and building Android APK via EAS Cloud Build...
echo Profile: preview (Standalone Installable APK)
echo.
call npx eas-cli build -p android --profile preview

echo.
echo [3/3] Fetching compiled APK into the 'builds' folder...
call npx eas-cli build:download -p android

rem If an apk was downloaded to root, move it into the builds directory
for %%f in (*.apk) do (
    move /y "%%f" "builds\StreakMate.apk" >nul 2>&1
)

echo.
echo ========================================================
if exist "builds\StreakMate.apk" (
    echo [SUCCESS] Standalone APK is ready in: builds\StreakMate.apk
) else (
    echo [INFO] Build completed on EAS Cloud!
    echo If download did not auto-place in 'builds', you can download the APK
    echo directly from the build URL displayed above or from your Expo dashboard:
    echo https://expo.dev/accounts/mayhem2002/projects/streakmate/builds
)
echo ========================================================
pause
