@echo off
chcp 65001 >nul
title SmartGym — Detener Docker
cls

echo ===================================================================
echo   🛑 DETENIENDO CONTENEDORES DOCKER SMARTGYM
echo ===================================================================
echo.

cd /d "%~dp0"
docker compose down

echo.
echo ✅ Contenedores detenidos correctamente.
pause
