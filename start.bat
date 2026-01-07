@echo off
echo ==================================
echo    BYD Landing Page Server
echo ==================================
echo.
echo Instalando dependencias...
call npm install
echo.
echo Iniciando servidor en http://localhost:3000
echo Presiona Ctrl+C para detener el servidor
echo.
npm start