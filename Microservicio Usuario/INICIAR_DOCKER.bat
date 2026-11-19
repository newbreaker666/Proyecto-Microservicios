@echo off
chcp 65001 >nul
title SmartGym — Iniciar en Docker
cls

echo ===================================================================
echo   🐳 SMARTGYM — DESPLIEGUE EN CONTENEDORES DOCKER
echo ===================================================================
echo.

cd /d "%~dp0"

echo [1/2] Construyendo y levantando contenedores con límites de RAM...
docker compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ===================================================================
    echo   ✅ CONTENEDORES DOCKER LEVANTADOS EXITOSAMENTE
    echo   • Frontend Web: http://localhost:4200
    echo   • Backend API:  http://localhost:3001/api/v1
    echo   • Health Check: http://localhost:3001/health
    echo ===================================================================
    echo Abriendo http://localhost:4200 ...
    start http://localhost:4200
) else (
    echo.
    echo ❌ Ocurrió un error al iniciar Docker Compose.
    echo Verifique que Docker Desktop esté en ejecución.
)

pause
