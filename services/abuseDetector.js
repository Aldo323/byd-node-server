/**
 * SERVICIO DE DETECCIÓN DE ABUSO Y SPAM
 * =====================================
 * 
 * Capa 1 del sistema de chatbot híbrido
 * Protege contra spam, rate limiting y bloqueo de IPs
 * 
 * CARACTERÍSTICAS:
 * - Rate limiting: Máximo 5 mensajes por minuto por IP
 * - Bloqueo temporal: 30 minutos después de 3 violaciones
 * - Detección de patrones de spam automática
 * - Almacenamiento en memoria con limpieza automática
 * 
 * @author Sistema BYD Chatbot
 * @version 1.0.0
 */

const crypto = require('crypto');

class AbuseDetector {
    constructor() {
        // Configuración del sistema
        this.config = {
            maxMessagesPerMinute: 5,        // Máximo 5 mensajes por minuto
            maxRepeatedMessages: 3,         // Máximo 3 mensajes repetidos
            minMessageLength: 3,            // Mínimo 3 caracteres
            blockDurationMinutes: 30,       // Bloqueo por 30 minutos
            violationsBeforeBlock: 3        // 3 violaciones = bloqueo automático
        };

        // Almacenamiento en memoria
        this.ipMessages = new Map();        // IP -> array de timestamps
        this.messageHashes = new Map();     // hash -> count por conversación
        this.blockedIPs = new Map();        // IP -> timestamp de desbloqueo
        this.ipViolations = new Map();      // IP -> contador de violaciones

        // Patrones de spam detectados
        // NOTA: Los números de teléfono (10 dígitos) NO son spam
        this.spamPatterns = [
            { pattern: /^a+$/i, description: 'Solo letras "a" repetidas' },
            { pattern: /^[asdfgh]+$/i, description: 'Teclas aleatorias del teclado' },
            // Números cortos (1-5 dígitos) son spam, pero 10 dígitos es teléfono válido
            { pattern: /^[0-9]{1,5}$/, description: 'Números muy cortos sin contexto' },
            { pattern: /^test$/i, description: 'Mensaje de prueba' },
            { pattern: /^prueba$/i, description: 'Mensaje de prueba en español' },
            { pattern: /^x+$/i, description: 'Solo letras "x" repetidas' },
            { pattern: /^(.)\1{4,}$/, description: 'Cualquier carácter repetido 5+ veces' },
            { pattern: /^[bcdfghjklmnpqrstvwxyz]{8,}$/i, description: 'Consonantes seguidas sin sentido' },
            { pattern: /^[.]{3,}$/, description: 'Solo puntos repetidos' },
            { pattern: /^[!@#$%^&*()]+$/, description: 'Solo símbolos sin texto' }
        ];

        // Limpiar memoria cada 5 minutos
        setInterval(() => {
            this.cleanupMemory();
        }, 5 * 60 * 1000);

        console.log('✅ AbuseDetector inicializado correctamente');
    }

    /**
     * FUNCIÓN PRINCIPAL DE VERIFICACIÓN
     * Analiza un mensaje y determina si es abuso/spam
     * 
     * @param {string} ip - Dirección IP del cliente
     * @param {string} message - Mensaje a verificar
     * @param {string} conversationId - ID de la conversación
     * @returns {Object} - Resultado del análisis
     */
    async check(ip, message, conversationId) {
        try {
            // 1. Verificar si la IP está bloqueada
            const blockCheck = await this.isIPBlocked(ip);
            if (blockCheck.isBlocked) {
                return {
                    isAbuse: true,
                    reason: `IP bloqueada temporalmente. Tiempo restante: ${blockCheck.minutesRemaining} minutos`,
                    action: 'block',
                    blockMinutesRemaining: blockCheck.minutesRemaining,
                    source: 'ip_blocked'
                };
            }

            // 2. Verificar longitud mínima del mensaje
            if (message.trim().length < this.config.minMessageLength) {
                await this.recordViolation(ip, 'mensaje_muy_corto');
                return {
                    isAbuse: true,
                    reason: `Mensaje demasiado corto (mínimo ${this.config.minMessageLength} caracteres)`,
                    action: 'warn',
                    source: 'length_check'
                };
            }

            // 3. Detectar patrones de spam
            const spamCheck = this.detectSpamPattern(message);
            if (spamCheck) {
                await this.recordViolation(ip, 'patron_spam');
                return {
                    isAbuse: true,
                    reason: `Patrón de spam detectado: ${spamCheck}`,
                    action: 'warn',
                    source: 'spam_pattern'
                };
            }

            // 4. Verificar rate limiting
            const rateLimitCheck = await this.checkRateLimit(ip);
            if (rateLimitCheck.exceeded) {
                await this.recordViolation(ip, 'rate_limit');
                return {
                    isAbuse: true,
                    reason: `Demasiados mensajes por minuto (máximo ${this.config.maxMessagesPerMinute})`,
                    action: 'warn',
                    source: 'rate_limit'
                };
            }

            // 5. Verificar mensajes repetidos
            const repeatCheck = await this.checkRepeatedMessage(message, conversationId);
            if (repeatCheck.isRepeated) {
                await this.recordViolation(ip, 'mensaje_repetido');
                return {
                    isAbuse: true,
                    reason: `Mensaje repetido demasiadas veces (${repeatCheck.count}/${this.config.maxRepeatedMessages})`,
                    action: 'warn',
                    source: 'repeated_message'
                };
            }

            // 6. Registrar mensaje válido
            await this.recordValidMessage(ip, message, conversationId);

            return {
                isAbuse: false,
                reason: null,
                action: null,
                source: 'valid_message'
            };

        } catch (error) {
            console.error('❌ Error en AbuseDetector.check:', error);
            // En caso de error, permitir el mensaje para no interrumpir el servicio
            return {
                isAbuse: false,
                reason: 'Error interno en verificación',
                action: null,
                source: 'error_fallback'
            };
        }
    }

    /**
     * DETECTAR PATRONES DE SPAM
     * Verifica si el mensaje coincide con patrones conocidos de spam
     * 
     * @param {string} message - Mensaje a verificar
     * @returns {string|null} - Descripción del patrón o null si no hay spam
     */
    detectSpamPattern(message) {
        const normalizedMessage = message.toLowerCase().trim();
        
        for (const { pattern, description } of this.spamPatterns) {
            if (pattern.test(normalizedMessage)) {
                console.log(`🚫 Patrón de spam detectado: "${normalizedMessage}" -> ${description}`);
                return description;
            }
        }

        return null;
    }

    /**
     * VERIFICAR RATE LIMITING
     * Controla la cantidad de mensajes por minuto por IP
     * 
     * @param {string} ip - Dirección IP del cliente
     * @returns {Object} - Estado del rate limit
     */
    async checkRateLimit(ip) {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);

        // Obtener mensajes de la IP en el último minuto
        if (!this.ipMessages.has(ip)) {
            this.ipMessages.set(ip, []);
        }

        const messages = this.ipMessages.get(ip);
        
        // Filtrar mensajes del último minuto
        const recentMessages = messages.filter(timestamp => timestamp > oneMinuteAgo);
        
        // Actualizar array con solo mensajes recientes
        this.ipMessages.set(ip, recentMessages);

        const exceeded = recentMessages.length >= this.config.maxMessagesPerMinute;

        if (exceeded) {
            console.log(`⚠️ Rate limit excedido para IP ${ip}: ${recentMessages.length}/${this.config.maxMessagesPerMinute} mensajes/min`);
        }

        return {
            exceeded,
            count: recentMessages.length,
            limit: this.config.maxMessagesPerMinute
        };
    }

    /**
     * VERIFICAR MENSAJES REPETIDOS
     * Detecta si un mensaje se ha repetido demasiadas veces en una conversación
     * 
     * @param {string} message - Mensaje a verificar
     * @param {string} conversationId - ID de la conversación
     * @returns {Object} - Estado de repetición
     */
    async checkRepeatedMessage(message, conversationId) {
        const hash = this.hashMessage(message);
        const key = `${conversationId}_${hash}`;

        if (!this.messageHashes.has(key)) {
            this.messageHashes.set(key, 0);
        }

        const count = this.messageHashes.get(key) + 1;
        this.messageHashes.set(key, count);

        const isRepeated = count > this.config.maxRepeatedMessages;

        if (isRepeated) {
            console.log(`🔄 Mensaje repetido detectado en conversación ${conversationId}: ${count} veces`);
        }

        return {
            isRepeated,
            count,
            limit: this.config.maxRepeatedMessages
        };
    }

    /**
     * REGISTRAR VIOLACIÓN
     * Incrementa el contador de violaciones y bloquea IP si es necesario
     * 
     * @param {string} ip - Dirección IP del cliente
     * @param {string} type - Tipo de violación
     */
    async recordViolation(ip, type) {
        if (!this.ipViolations.has(ip)) {
            this.ipViolations.set(ip, { count: 0, types: [] });
        }

        const violations = this.ipViolations.get(ip);
        violations.count++;
        violations.types.push({ type, timestamp: Date.now() });

        console.log(`⚠️ Violación registrada para IP ${ip}: ${type} (Total: ${violations.count})`);

        // Bloquear IP si excede el límite de violaciones
        if (violations.count >= this.config.violationsBeforeBlock) {
            await this.blockIP(ip);
            console.log(`🚫 IP ${ip} bloqueada automáticamente por ${violations.count} violaciones`);
        }
    }

    /**
     * BLOQUEAR IP TEMPORALMENTE
     * Bloquea una IP por el tiempo configurado
     * 
     * @param {string} ip - Dirección IP a bloquear
     */
    async blockIP(ip) {
        const blockUntil = Date.now() + (this.config.blockDurationMinutes * 60 * 1000);
        this.blockedIPs.set(ip, blockUntil);
        
        console.log(`🚫 IP ${ip} bloqueada hasta: ${new Date(blockUntil).toLocaleString()}`);
    }

    /**
     * VERIFICAR SI IP ESTÁ BLOQUEADA
     * Comprueba el estado de bloqueo de una IP
     * 
     * @param {string} ip - Dirección IP a verificar
     * @returns {Object} - Estado del bloqueo
     */
    async isIPBlocked(ip) {
        if (!this.blockedIPs.has(ip)) {
            return { isBlocked: false, minutesRemaining: 0 };
        }

        const blockUntil = this.blockedIPs.get(ip);
        const now = Date.now();

        if (now >= blockUntil) {
            // El bloqueo ha expirado, remover de la lista
            this.blockedIPs.delete(ip);
            this.ipViolations.delete(ip); // Limpiar violaciones también
            console.log(`✅ Bloqueo expirado para IP ${ip}`);
            return { isBlocked: false, minutesRemaining: 0 };
        }

        const minutesRemaining = Math.ceil((blockUntil - now) / (60 * 1000));
        return { isBlocked: true, minutesRemaining };
    }

    /**
     * REGISTRAR MENSAJE VÁLIDO
     * Registra un mensaje que pasó todas las verificaciones
     * 
     * @param {string} ip - Dirección IP del cliente
     * @param {string} message - Mensaje válido
     * @param {string} conversationId - ID de la conversación
     */
    async recordValidMessage(ip, message, conversationId) {
        // Agregar timestamp del mensaje válido
        if (!this.ipMessages.has(ip)) {
            this.ipMessages.set(ip, []);
        }
        
        this.ipMessages.get(ip).push(Date.now());
    }

    /**
     * GENERAR HASH DE MENSAJE
     * Crea un hash simple del mensaje normalizado para comparaciones
     * 
     * @param {string} message - Mensaje a hashear
     * @returns {string} - Hash del mensaje
     */
    hashMessage(message) {
        const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
        return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
    }

    /**
     * LIMPIAR MEMORIA
     * Elimina datos antiguos para evitar acumulación de memoria
     */
    cleanupMemory() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        // Limpiar timestamps de mensajes antiguos (más de 1 hora)
        for (const [ip, timestamps] of this.ipMessages.entries()) {
            const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);
            if (recentTimestamps.length === 0) {
                this.ipMessages.delete(ip);
            } else {
                this.ipMessages.set(ip, recentTimestamps);
            }
        }

        // Limpiar hashes de mensajes antiguos (más de 1 día)
        const keysToDelete = [];
        for (const [key, count] of this.messageHashes.entries()) {
            // Para simplicidad, limpiamos hashes después de 1 día
            // En producción podrías agregar timestamps más específicos
            if (Math.random() < 0.1) { // Limpieza probabilística del 10%
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.messageHashes.delete(key));

        // Limpiar violaciones antiguas (más de 1 día)
        for (const [ip, data] of this.ipViolations.entries()) {
            const recentViolations = data.types.filter(v => v.timestamp > oneDayAgo);
            if (recentViolations.length === 0) {
                this.ipViolations.delete(ip);
            } else {
                this.ipViolations.set(ip, { count: recentViolations.length, types: recentViolations });
            }
        }

        // Limpiar IPs bloqueadas que ya expiraron
        for (const [ip, blockUntil] of this.blockedIPs.entries()) {
            if (now >= blockUntil) {
                this.blockedIPs.delete(ip);
            }
        }

        console.log('🧹 Limpieza de memoria completada en AbuseDetector');
    }

    /**
     * OBTENER ESTADÍSTICAS DEL SISTEMA
     * Retorna información sobre el estado actual del detector
     * 
     * @returns {Object} - Estadísticas del sistema
     */
    getStats() {
        return {
            activeIPs: this.ipMessages.size,
            blockedIPs: this.blockedIPs.size,
            trackedHashes: this.messageHashes.size,
            violatedIPs: this.ipViolations.size,
            config: this.config
        };
    }
}

// Crear instancia singleton
const abuseDetector = new AbuseDetector();

module.exports = abuseDetector;