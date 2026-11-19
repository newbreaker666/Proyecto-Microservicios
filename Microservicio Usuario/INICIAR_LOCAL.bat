@echo off
chcp 65001 >nul
title SmartGym — Inicio Local (Backend + Frontend)
cls

echo ===================================================================
echo   🏋️  SMARTGYM — MICROSERVICIO DE USUARIOS E IDENTIDAD
echo   Modo: Ejecución Local Ultraligera (Sin consumo excesivo de RAM)
echo ===================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando base de datos SQL Server...
python "%~dp0Back\database\ejecutar_sql.py"
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] No se pudo verificar la BD mediante script de python.
    echo Asegúrese de que SQL Server esté corriendo en el puerto 1433.
)

echo.
echo [2/3] Levantando Servidor Backend (Node.js Express en :3001)...
start "SmartGym - MS-Usuarios Backend (:3001)" cmd /k "cd /d "%~dp0Back" && node server.js"

timeout /t 2 /nobreak >nul

echo.
echo [3/3] Levantando Portal Frontend (Angular 19 en :4200)...
start "SmartGym - Frontend Web (:4200)" cmd /k "cd /d "%~dp0Front" && npm start"

timeout /t 3 /nobreak >nul

echo.
echo ===================================================================
echo   ✅ SISTEMA LEVANTADO CON ÉXITO
echo   • Frontend Web:     http://localhost:4200
echo   • API Backend:      http://localhost:3001/api/v1
echo   • Health Check:     http://localhost:3001/health
echo ===================================================================
echo.
echo Abriendo navegador en http://localhost:4200 ...
start http://localhost:4200
pause
