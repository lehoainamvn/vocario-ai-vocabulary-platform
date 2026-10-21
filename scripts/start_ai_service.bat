@echo off
title Vocario AI Vision Engine (YOLO-World + Groq)
echo ========================================================
echo   KHOI DONG VOCARIO AI VISION SERVER (Port 8001)
echo   - YOLO-World v2 Zero-Shot Object Detection
echo   - Tu dong phien am IPA bang eng-to-ipa
echo   - Tu dong dich nghia bang deep-translator
echo   - Sinh hoi thoai & ngu canh thuc te bang Groq LLM
echo ========================================================
cd /d "%~dp0\.."
py -m uvicorn backend.services.ai_vision_server:app --host 127.0.0.1 --port 8001 --reload
pause
