@echo off
chcp 65001 >nul
title SmartGym — Detener Servicios Locales
cls

echo ===================================================================
echo   🛑 DETENIENDO SERVICIOS LOCALES DE SMARTGYM (MS-USUARIOS)
echo ===================================================================
echo.

echo Liberando puerto 3001 (Backend Node.js)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a 2>nul
)

echo Liberando puerto 4200 (Frontend Angular)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4200') do (
    taskkill /f /pid %%a 2>nul
)

echo.
echo ✅ Todos los procesos en los puertos 3001 y 4200 han sido detenidos.
pause
