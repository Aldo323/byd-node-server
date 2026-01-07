@echo off
echo ========================================
echo  CONSTRUCCION LOCAL DOCKER
echo  BYD Landing Page - Node.js Server
echo ========================================

set IMAGE_NAME=byd-landing-server
set TAG=local

echo.
echo 1. Compilando imagen Docker localmente...
docker build -t %IMAGE_NAME%:%TAG% .

if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo en la compilacion de la imagen
    pause
    exit /b 1
)

echo.
echo 2. Imagen compilada exitosamente
echo.
echo Para ejecutar la imagen:
echo docker run -p 3001:3001 --name byd_server %IMAGE_NAME%:%TAG%
echo.
echo O usando docker-compose:
echo docker-compose up -d
echo.
echo URL local: http://localhost:3001
echo.
pause