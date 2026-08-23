@echo off
echo ========================================================
echo AI Engine: Local Offline Model Setup (Option B Fallback)
echo ========================================================
echo.
echo Step 1: Setting Ollama to use the 2TB D:\ Drive...
setx OLLAMA_MODELS "D:\AI unihack antigravity\AI-Powered-Product-Intelligence-for-Industrial-Commerce\ollama_models" /M
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Please right-click this file and select "Run as Administrator"!
    pause
    exit /b
)
echo [SUCCESS] Model storage path set to D:\AI unihack antigravity\AI-Powered-Product-Intelligence-for-Industrial-Commerce\ollama_models
echo.
echo Step 2: Downloading Ollama Installer...
curl -L -o OllamaSetup.exe https://ollama.com/download/OllamaSetup.exe
echo [SUCCESS] Download complete.
echo.
echo Step 3: Installing Ollama (Please click 'Yes' if prompted)...
start /wait OllamaSetup.exe
echo.
echo Step 4: Downloading Llama 3.1 (8B) to D:\ drive...
ollama pull llama3.1
echo.
echo Step 5: Downloading Qwen 2.5 (7B) to D:\ drive...
ollama pull qwen2.5
echo.
echo ========================================================
echo Setup Complete! The Local AI Fallbacks are ready!
echo ========================================================
pause
