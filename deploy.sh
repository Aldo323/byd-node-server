#!/bin/bash
#
# Blue-Green Deployment Script para salmabydriver.com
# Uso: ./deploy.sh [build|quick]
#   build = reconstruye imagen y hace deploy (para cambios en código JS)
#   quick = solo reinicia con volúmenes (para cambios en views/CSS)
#

set -e

PROJECT_DIR="/root/projects/byd-node-server-13-Octubre"
NGINX_UPSTREAM="/etc/nginx/conf.d/salma-upstream.conf"
IMAGE_NAME="byd-node-server"
DOCKER_NETWORK="unified_network"  # Red donde está postgres

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Cargar variables de entorno de forma segura
load_env() {
    if [ -f "$PROJECT_DIR/.env" ]; then
        export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
        log_success "Variables de entorno cargadas"
    else
        log_error "Archivo .env no encontrado"
        exit 1
    fi
}

# Detectar cuál está activo (blue o green)
get_active_container() {
    if docker ps --format '{{.Names}}' | grep -q "salmabydriver_blue"; then
        if docker ps --format '{{.Names}}' | grep -q "salmabydriver_green"; then
            # Ambos corriendo, revisar nginx
            if grep -q "server 127.0.0.1:8085" "$NGINX_UPSTREAM" 2>/dev/null; then
                echo "blue"
            else
                echo "green"
            fi
        else
            echo "blue"
        fi
    elif docker ps --format '{{.Names}}' | grep -q "salmabydriver_green"; then
        echo "green"
    else
        # Verificar contenedor legacy
        if docker ps --format '{{.Names}}' | grep -q "salmabydriver_main"; then
            echo "legacy"
        else
            echo "none"
        fi
    fi
}

# Verificar health del contenedor
wait_for_healthy() {
    local container=$1
    local max_attempts=30
    local attempt=0

    log_info "Esperando que $container esté healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if docker exec "$container" wget -q --spider http://localhost:3001 2>/dev/null; then
            log_success "$container está healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    log_error "$container no respondió después de $max_attempts intentos"
    return 1
}

# Cambiar nginx al nuevo upstream
switch_nginx() {
    local target_port=$1

    log_info "Cambiando nginx al puerto $target_port..."

    cat > "$NGINX_UPSTREAM" << EOF
# Upstream para salmabydriver.com - Blue-Green Deployment
# Generado automáticamente por deploy.sh
# Activo: puerto $target_port

upstream salma_backend {
    server 127.0.0.1:$target_port;
}
EOF

    # Verificar configuración de nginx
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log_success "Nginx recargado - tráfico ahora en puerto $target_port"
    else
        log_error "Error en configuración de nginx"
        return 1
    fi
}

# Deploy principal
deploy() {
    local build_image=$1

    cd "$PROJECT_DIR"

    # Cargar variables de entorno
    load_env

    # Detectar estado actual
    local active=$(get_active_container)
    log_info "Contenedor activo: $active"

    # Determinar target
    local target_name
    local target_port
    local old_name

    if [ "$active" = "blue" ]; then
        target_name="salmabydriver_green"
        target_port="8086"
        old_name="salmabydriver_blue"
    elif [ "$active" = "green" ]; then
        target_name="salmabydriver_blue"
        target_port="8085"
        old_name="salmabydriver_green"
    elif [ "$active" = "legacy" ]; then
        # Migrar desde contenedor legacy
        log_warning "Migrando desde contenedor legacy..."
        target_name="salmabydriver_blue"
        target_port="8085"
        old_name="salmabydriver_main"
    else
        # Primera vez - iniciar blue
        target_name="salmabydriver_blue"
        target_port="8085"
        old_name=""
    fi

    # Build si es necesario
    if [ "$build_image" = "true" ]; then
        log_info "Construyendo imagen $IMAGE_NAME..."
        docker build -t "$IMAGE_NAME:latest" .
        log_success "Imagen construida"
    fi

    # Detener target si existe
    if docker ps -a --format '{{.Names}}' | grep -q "$target_name"; then
        log_info "Deteniendo $target_name existente..."
        docker stop "$target_name" 2>/dev/null || true
        docker rm "$target_name" 2>/dev/null || true
    fi

    # Iniciar nuevo contenedor
    log_info "Iniciando $target_name en puerto $target_port..."

    docker run -d \
        --name "$target_name" \
        --network "$DOCKER_NETWORK" \
        -p "127.0.0.1:$target_port:3001" \
        -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
        -e DB_HOST="$DB_HOST" \
        -e DB_PORT="$DB_PORT" \
        -e DB_DATABASE="$DB_DATABASE" \
        -e DB_USER="$DB_USER" \
        -e DB_PASSWORD="$DB_PASSWORD" \
        -e PORT=3001 \
        -e SMS_GATEWAY_URL="$SMS_GATEWAY_URL" \
        -e SMS_API_KEY="$SMS_API_KEY" \
        -e NODE_ENV=production \
        -v "$PROJECT_DIR/views:/app/views:ro" \
        -v "$PROJECT_DIR/public:/app/public:ro" \
        --restart unless-stopped \
        "$IMAGE_NAME:latest"

    # Esperar que esté healthy
    if ! wait_for_healthy "$target_name"; then
        log_error "El nuevo contenedor no está healthy. Abortando..."
        docker stop "$target_name" 2>/dev/null || true
        docker rm "$target_name" 2>/dev/null || true
        exit 1
    fi

    # Cambiar nginx
    switch_nginx "$target_port"

    # Esperar un momento y detener el viejo
    if [ -n "$old_name" ]; then
        sleep 3
        log_info "Deteniendo contenedor anterior ($old_name)..."
        docker stop "$old_name" 2>/dev/null || true
        docker rm "$old_name" 2>/dev/null || true
        log_success "Contenedor anterior eliminado"
    fi

    echo ""
    log_success "=========================================="
    log_success "  DEPLOYMENT COMPLETADO SIN DOWNTIME!"
    log_success "  Activo: $target_name (puerto $target_port)"
    log_success "=========================================="
}

# Quick deploy (solo para cambios en views/CSS)
quick_deploy() {
    log_info "Quick deploy - Los cambios en views/CSS ya están activos (volúmenes montados)"
    log_success "No se requiere reinicio para cambios en archivos estáticos"
}

# Main
case "${1:-build}" in
    build)
        log_info "Iniciando deploy con rebuild de imagen..."
        deploy "true"
        ;;
    quick)
        quick_deploy
        ;;
    status)
        active=$(get_active_container)
        echo "Contenedor activo: $active"
        docker ps --filter "name=salmabydriver" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    *)
        echo "Uso: $0 [build|quick|status]"
        echo "  build  - Reconstruye imagen y despliega (cambios en código JS)"
        echo "  quick  - Solo para cambios en views/CSS (instantáneo)"
        echo "  status - Muestra estado actual"
        exit 1
        ;;
esac
