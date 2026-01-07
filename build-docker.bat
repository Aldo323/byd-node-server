@echo off
echo ========================================
echo  COMPILACION Y SUBIDA A DOCKER HUB
echo  BYD Landing Page - Node.js Server
echo ========================================

set IMAGE_NAME=aldomoreno/byd-landing-server
set TAG=latest
rem Obtener fecha en formato YYYYMMDD compatible con Docker tags
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TAG_DATE=%datetime:~0,4%%datetime:~4,2%%datetime:~6,2%

echo.
echo 1. Compilando imagen Docker para BYD Landing Server...
docker build -t %IMAGE_NAME%:%TAG% .

if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo en la compilacion de la imagen
    pause
    exit /b 1
)

echo.
echo 2. Imagen compilada exitosamente
echo.

echo 3. Etiquetando imagen con fecha...
docker tag %IMAGE_NAME%:%TAG% %IMAGE_NAME%:%TAG_DATE%

echo.
echo 4. Iniciando sesion en Docker Hub...
docker login -u aldomoreno

if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo en el login de Docker Hub
    pause
    exit /b 1
)

echo.
echo 5. Subiendo imagen a Docker Hub...
echo   - Subiendo imagen con tag 'latest'...
docker push %IMAGE_NAME%:%TAG%

if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo al subir la imagen con tag latest
    pause
    exit /b 1
)

echo   - Subiendo imagen con tag de fecha '%TAG_DATE%'...
docker push %IMAGE_NAME%:%TAG_DATE%

if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo al subir la imagen
    pause
    exit /b 1
)

echo.
echo ========================================
echo  COMPLETADO EXITOSAMENTE!
echo ========================================
echo.
echo Imagenes disponibles en Docker Hub:
echo   - %IMAGE_NAME%:%TAG% (ultima version)
echo   - %IMAGE_NAME%:%TAG_DATE% (version con fecha)
echo.
echo Para ejecutar la imagen localmente:
echo docker run -p 3001:3001 %IMAGE_NAME%:%TAG%
echo.
echo Para desplegar en el servidor:
echo ssh root@[TU_SERVIDOR_IP]
echo docker pull %IMAGE_NAME%:%TAG%
echo docker run -d --name byd_landing_server -p 127.0.0.1:3001:3001 --restart unless-stopped %IMAGE_NAME%:%TAG%
echo.
echo URLs:
echo   - Local: http://localhost:3001
echo   - Docker Hub: https://hub.docker.com/r/aldomoreno/byd-landing-server
echo.
pause