@echo off
chcp 65001 > nul
title IFNMG Assistente - Inicializador
color 0B

echo ================================================================
echo         🎓 IFNMG ASSISTENTE - TUTOR COM IA PARA O VIRTUAL2
echo ================================================================
echo.
echo  [1/3] Verificando dependencias...

REM Verifica Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado! Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b
)

REM Verifica Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERRO] Python nao encontrado! Por favor, instale o Python em: https://www.python.org/
        pause
        exit /b
    )
)

echo  [2/3] Iniciando Backend e Servidor IA...
cd /d "%~dp0backend"
if exist venv\Scripts\activate.bat (
    start "IFNMG Backend API" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --port 8000 --host 127.0.0.1"
) else (
    start "IFNMG Backend API" cmd /k "cd /d "%~dp0backend" && uvicorn app.main:app --port 8000 --host 127.0.0.1"
)

echo  [3/3] Iniciando Interface Web (Frontend)...
cd /d "%~dp0frontend"
start "IFNMG Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ================================================================
echo  ✅ SISTEMA INICIADO COM SUCESSO!
echo  👉 Abrindo o navegador em: http://localhost:3000
echo ================================================================
echo.

REM Aguarda 3 segundos para os servidores subirem e abre o navegador
timeout /t 3 /nobreak > nul
start http://localhost:3000

echo Pressione qualquer tecla para fechar esta janela (os servidores continuarao rodando).
pause > nul
