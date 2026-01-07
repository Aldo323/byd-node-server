# BYD Landing Page - Servidor Node.js

Versión independiente del servidor Node.js para la landing page de BYD, sin conflictos de dependencias.

## Inicio Rápido

### Opción 1: Usar el archivo start.bat
Simplemente ejecuta:
```
start.bat
```

### Opción 2: Instalación manual
```bash
cd C:\Users\Lenovo\Desktop\BYD\Original\byd-node-server
npm install
npm start
```

## Estructura
```
byd-node-server/
├── server.js          # Servidor Express
├── package.json       # Dependencias mínimas
├── views/
│   └── index.ejs      # Plantilla HTML
├── public/
│   ├── css/           # Estilos CSS
│   ├── js/            # JavaScript del cliente
│   └── images/        # Imágenes de vehículos BYD
└── start.bat          # Script de inicio fácil
```

## Características
- ✅ Sin conflictos de dependencias
- ✅ Instalación rápida y limpia
- ✅ Formularios funcionales
- ✅ Calculadora de ahorros
- ✅ API REST para contacto y cotizaciones
- ✅ Diseño responsivo

## APIs disponibles
- `GET /` - Página principal
- `POST /api/contact` - Formulario de contacto
- `POST /api/quote` - Solicitud de cotización
- `POST /api/calculate-savings` - Calculadora de ahorros

El servidor se ejecuta en `http://localhost:3000`