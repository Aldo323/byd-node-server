# Usar Node.js 18 LTS como imagen base
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S byd -u 1001

# Cambiar propiedad de archivos
RUN chown -R byd:nodejs /app
USER byd

# Exponer puerto 3001 (puerto por defecto del servidor)
EXPOSE 3001

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar la aplicación
CMD ["node", "server.js"]