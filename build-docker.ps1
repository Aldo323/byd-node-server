# PowerShell version for building and pushing to Docker Hub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " COMPILACION Y SUBIDA A DOCKER HUB" -ForegroundColor Cyan
Write-Host " BYD Landing Page - Node.js Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$IMAGE_NAME = "aldomoreno/byd-landing-server"
$TAG = "latest"
$TAG_DATE = Get-Date -Format "yyyyMMdd"

Write-Host ""
Write-Host "1. Compilando imagen Docker para BYD Landing Server..." -ForegroundColor Yellow
docker build -t ${IMAGE_NAME}:${TAG} .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo en la compilacion de la imagen" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "2. Imagen compilada exitosamente" -ForegroundColor Green
Write-Host ""

Write-Host "3. Etiquetando imagen con fecha..." -ForegroundColor Yellow
docker tag ${IMAGE_NAME}:${TAG} ${IMAGE_NAME}:${TAG_DATE}

Write-Host ""
Write-Host "4. Iniciando sesion en Docker Hub..." -ForegroundColor Yellow
docker login -u aldomoreno

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo en el login de Docker Hub" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "5. Subiendo imagen a Docker Hub..." -ForegroundColor Yellow
Write-Host "   - Subiendo imagen con tag 'latest'..." -ForegroundColor Gray
docker push ${IMAGE_NAME}:${TAG}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo al subir la imagen con tag latest" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "   - Subiendo imagen con tag de fecha '${TAG_DATE}'..." -ForegroundColor Gray
docker push ${IMAGE_NAME}:${TAG_DATE}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo al subir la imagen" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Imagenes disponibles en Docker Hub:" -ForegroundColor Cyan
Write-Host "  - ${IMAGE_NAME}:${TAG} (ultima version)" -ForegroundColor White
Write-Host "  - ${IMAGE_NAME}:${TAG_DATE} (version con fecha)" -ForegroundColor White
Write-Host ""
Write-Host "Para ejecutar la imagen localmente:" -ForegroundColor Yellow
Write-Host "docker run -p 3001:3001 ${IMAGE_NAME}:${TAG}" -ForegroundColor White
Write-Host ""
Write-Host "Para desplegar en el servidor:" -ForegroundColor Yellow
Write-Host "ssh root@[TU_SERVIDOR_IP]" -ForegroundColor White
Write-Host "docker pull ${IMAGE_NAME}:${TAG}" -ForegroundColor White
Write-Host "docker run -d --name byd_landing_server -p 127.0.0.1:3001:3001 --restart unless-stopped ${IMAGE_NAME}:${TAG}" -ForegroundColor White
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  - Local: http://localhost:3001" -ForegroundColor White
Write-Host "  - Docker Hub: https://hub.docker.com/r/aldomoreno/byd-landing-server" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter para salir"