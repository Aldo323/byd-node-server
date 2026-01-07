/**
 * SERVICIO DE RESPUESTAS CON TEMPLATES
 * ===================================
 * 
 * Capa 2 del sistema de chatbot híbrido
 * Proporciona respuestas instantáneas sin consumir tokens de Claude AI
 * 
 * CARACTERÍSTICAS:
 * - Respuestas pre-programadas para consultas comunes
 * - 0 tokens consumidos de Claude API
 * - Detección inteligente de patrones
 * - Respuestas personalizadas para BYD
 * 
 * @author Sistema BYD Chatbot
 * @version 1.0.0
 */

class TemplateResponses {
    constructor() {
        // Definir todas las categorías de respuestas template
        this.templates = {
            // 1. SALUDOS Y BIENVENIDA
            saludos: {
                patterns: [
                    /^(hola|hi|hello|hey|buenas|buenos días|buenas tardes|buenas noches)$/i,
                    /^(hola|hi|hello|hey)\s*(salma|byd|chatbot)?[\s!.]*$/i,
                    /^(buenos días|buenas tardes|buenas noches)[\s!.]*$/i
                ],
                response: `¡Hola! 👋 Soy Salma AI, tu asesora virtual BYD. 

¿En qué puedo ayudarte hoy? Puedo informarte sobre:
• Nuestros vehículos eléctricos e híbridos
• Ubicación y horarios del showroom
• Agendar una prueba de manejo
• Calcular tus ahorros con BYD

¡Pregúntame lo que necesites! 🚗⚡`
            },

            // 2. HORARIOS DE ATENCIÓN
            horarios: {
                patterns: [
                    /horario|hora[s]?|abierto|cierran|atienden|qué horas/i,
                    /a qué hora|cuándo abren|cuándo cierran/i,
                    /están abiertos|horario de atención/i
                ],
                response: `📅 **Horario de Atención - BYD Lindavista CLEBER**

🕘 **Lunes a Sábado:** 9:00 AM - 7:00 PM

📍 Avenida las Américas Norte & Málaga, 67130 Guadalupe, N.L.

¡Te esperamos para conocer toda la línea BYD! ¿Te gustaría agendar una cita? 📱`
            },

            // 3. UBICACIÓN Y DIRECCIÓN
            ubicacion: {
                patterns: [
                    /ubicación|dirección|dónde están|cómo llegar|donde|ubicados/i,
                    /showroom|sucursal|oficina|local/i,
                    /mapa|gps|coordenadas/i
                ],
                response: `📍 **BYD Lindavista CLEBER**

📌 **Dirección:** Avenida las Américas Norte & Málaga, 67130 Guadalupe, N.L.
🚗 **Agencia:** BYD Lindavista CLEBER
🅿️ **Estacionamiento:** Gratuito disponible

**Horarios:**
• Lunes a Sábado: 9:00 AM - 7:00 PM

¿Te gustaría agendar una cita para conocer los vehículos en persona? 📱`
            },

            // 4. INFORMACIÓN DE MODELOS - Solo cuando preguntan explícitamente por TODOS los modelos
            modelos: {
                patterns: [
                    /^(qué|cuáles|cuales)\s+(modelos|vehículos|autos|carros)\s+(tienen|hay|manejan)/i,
                    /^(muéstrame|muestrame|dime)\s+(los|todos los)\s+(modelos|vehículos)/i,
                    /^(qué|que)\s+gama\s+tienen/i,
                    /^ver\s+(todos\s+los\s+)?modelos/i,
                    /^catálogo\s+(completo|de\s+vehículos)/i
                ],
                response: `🚗 **LÍNEA COMPLETA BYD DISPONIBLE**

**100% ELÉCTRICOS:** ⚡
• **Dolphin Mini** - Compacto urbano (300-380 km autonomía)
• **Seal** - Sedán premium (460-520 km autonomía)
• **Sealion 7** - SUV familiar (542 km autonomía)
• **Yuan Pro** - SUV compacto (401 km autonomía)

**HÍBRIDOS ENCHUFABLES:** 🔄
• **King** - Sedán ejecutivo (1,175 km autonomía total)
• **Song Plus** - SUV mediano (1,001 km autonomía total)
• **Shark** - Pickup 4x4 (840 km autonomía total)

**Tecnología Blade Battery** - La batería más segura del mundo 🛡️

¿Cuál modelo te interesa conocer más a detalle? 🤔`
            },

            // 5. PRECIOS GENERALES - DESACTIVADO - Mejor que Claude maneje esto contextualmente
            // precios_generales: { ... }
            // Este template causaba respuestas genéricas ignorando el modelo que el cliente ya mencionó

            // 6. AUTONOMÍA - DESACTIVADO - Claude dará info específica del modelo que interesa
            // Este template daba lista genérica cuando el cliente preguntaba del modelo específico

            // 7. PRUEBA DE MANEJO - DESACTIVADO - Claude manejará esto con contexto
            // Este template preguntaba "¿Qué modelo?" cuando el cliente ya lo había dicho

            // 8. COMPARACIONES
            comparacion: {
                patterns: [
                    /comparar|diferencia|versus|vs|mejor que|cuál es mejor/i,
                    /ventajas|beneficios|por qué|qué ventaja/i,
                    /tesla|nissan|bmw|audi|mercedes/i
                ],
                response: `🏆 **¿Por qué elegir BYD?**

**TECNOLOGÍA LÍDER:**
✅ Blade Battery - La batería más segura del mundo
✅ 0-100% carga en casa durante la noche
✅ Carga rápida: 30-80% en 30 minutos

**GARANTÍA INCOMPARABLE:**
✅ 6 años vehículo completo
✅ 8 años batería
✅ Red de servicio en México

**RELACIÓN PRECIO-VALOR:**
✅ Tecnología premium a precio accesible
✅ Menores costos de mantenimiento
✅ Ahorro significativo vs gasolina

**RESPALDO GLOBAL:**
✅ #1 mundial en vehículos eléctricos
✅ Más de 20 años de experiencia en baterías

¿Te gustaría conocer los ahorros específicos comparado con tu vehículo actual? 🧮`
            },

            // 9. DESPEDIDAS
            despedida: {
                patterns: [
                    /gracias|thank you|te agradezco/i,
                    /adiós|adios|bye|hasta luego|nos vemos/i,
                    /ya me voy|me tengo que ir/i
                ],
                response: `¡Gracias por tu interés en BYD! 🚗⚡

**Recuerda que puedes:**
• Calcular tus ahorros: salmabydriver.com/calculatusahorros
• Visitarnos en Guadalupe, N.L.
• Escribirme cuando gustes

**¡Estoy aquí para ayudarte cuando lo necesites!**

¡Que tengas un excelente día y pronto manejes eléctrico! 🌱⚡`
            },

            // 10. INFORMACIÓN DE CONTACTO
            contacto: {
                patterns: [
                    /teléfono|celular|whatsapp|llamar|contacto/i,
                    /número|llamada|comunicar|hablar con alguien/i,
                    /asesor|vendedor|humano/i
                ],
                response: `📞 **Información de Contacto - BYD Lindavista CLEBER**

📱 WhatsApp: +52 81 2027 2752
☎️ Teléfono: (81) 2027-2752

📍 Avenida las Américas Norte & Málaga, 67130 Guadalupe, N.L.

**Horarios:**
🕘 Lunes a Sábado: 9:00 AM - 7:00 PM

**¿Prefieres que un asesor humano te contacte?**
Solo compárteme tu nombre y teléfono, y te llamaremos en unos minutos! 📱

¡También puedes seguir preguntándome aquí! 🤖`
            },

            // 11. CARGA Y INFRAESTRUCTURA
            carga: {
                patterns: [
                    /carga|cargar|cargador|electricidad|enchufar/i,
                    /dónde cargar|estaciones|tiempo de carga/i,
                    /instalación|casa/i
                ],
                response: `🔌 **Carga de Vehículos BYD**

**EN CASA:**
🏠 Enchufe normal (110V): Carga nocturna completa
🏠 Cargador L2 (220V): 4-8 horas carga completa
⚡ Instalación incluida en algunos modelos

**CARGA PÚBLICA:**
🚗 Electrify America, CFE, Voltra
⚡ Carga rápida DC: 30-80% en 30 minutos
📍 Red en crecimiento en México

**CARGA EN EL TRABAJO:**
🏢 Muchas empresas ya tienen estaciones
⚡ Aprovecha tu tiempo productivo

**¿Te preocupa la carga?** ¡Es más fácil de lo que piensas!
La mayoría carga solo en casa durante la noche 🌙

¿Tienes alguna situación específica de carga? 🤔`
            }
        };

        console.log('✅ TemplateResponses inicializado con', Object.keys(this.templates).length, 'categorías');
    }

    /**
     * FUNCIÓN PRINCIPAL DE MATCHING
     * Busca si el mensaje coincide con algún template
     * 
     * @param {string} message - Mensaje del usuario
     * @returns {Object|null} - Template encontrado o null
     */
    match(message) {
        try {
            // Normalizar mensaje
            const normalizedMessage = message.toLowerCase().trim();
            
            // Si el mensaje está vacío, no hacer matching
            if (!normalizedMessage || normalizedMessage.length < 2) {
                return null;
            }

            // Buscar coincidencias en todas las categorías
            for (const [category, template] of Object.entries(this.templates)) {
                for (const pattern of template.patterns) {
                    if (pattern.test(normalizedMessage)) {
                        console.log(`✅ Template match encontrado: "${normalizedMessage}" -> ${category}`);
                        return {
                            category: category,
                            response: template.response,
                            pattern: pattern.toString(),
                            confidence: this.calculateConfidence(normalizedMessage, pattern)
                        };
                    }
                }
            }

            // No se encontró ningún template
            return null;

        } catch (error) {
            console.error('❌ Error en TemplateResponses.match:', error);
            return null;
        }
    }

    /**
     * CALCULAR CONFIANZA DEL MATCH
     * Determina qué tan bien coincide el mensaje con el patrón
     * 
     * @param {string} message - Mensaje normalizado
     * @param {RegExp} pattern - Patrón que hizo match
     * @returns {number} - Confianza entre 0.0 y 1.0
     */
    calculateConfidence(message, pattern) {
        // Patrones más específicos tienen mayor confianza
        const messageLength = message.length;
        const matchLength = (message.match(pattern) || [''])[0].length;
        
        // Si el match cubre la mayor parte del mensaje, mayor confianza
        const coverage = matchLength / messageLength;
        
        // Ajustar confianza base según el tipo de patrón
        let baseConfidence = 0.8;
        
        // Patrones más específicos
        if (pattern.source.includes('whatsapp|teléfono|llamar')) {
            baseConfidence = 0.95;
        } else if (pattern.source.includes('modelos|vehículos|carros')) {
            baseConfidence = 0.9;
        } else if (pattern.source.includes('precio|costo|cuánto')) {
            baseConfidence = 0.85;
        }

        return Math.min(baseConfidence + (coverage * 0.1), 1.0);
    }

    /**
     * BUSCAR TEMPLATES POR CATEGORÍA
     * Obtiene templates de una categoría específica
     * 
     * @param {string} category - Categoría a buscar
     * @returns {Object|null} - Template de la categoría o null
     */
    getByCategory(category) {
        return this.templates[category] || null;
    }

    /**
     * OBTENER TODAS LAS CATEGORÍAS
     * Lista todas las categorías disponibles
     * 
     * @returns {Array} - Array de nombres de categorías
     */
    getCategories() {
        return Object.keys(this.templates);
    }

    /**
     * AGREGAR NUEVO TEMPLATE
     * Permite agregar templates dinámicamente
     * 
     * @param {string} category - Nombre de la categoría
     * @param {Array} patterns - Array de patrones RegExp
     * @param {string} response - Respuesta del template
     */
    addTemplate(category, patterns, response) {
        try {
            this.templates[category] = {
                patterns: patterns,
                response: response
            };
            console.log(`✅ Template agregado: ${category}`);
        } catch (error) {
            console.error('❌ Error al agregar template:', error);
        }
    }

    /**
     * OBTENER ESTADÍSTICAS
     * Retorna información sobre los templates disponibles
     * 
     * @returns {Object} - Estadísticas de templates
     */
    getStats() {
        const stats = {
            totalCategories: Object.keys(this.templates).length,
            totalPatterns: 0,
            categories: {}
        };

        for (const [category, template] of Object.entries(this.templates)) {
            stats.totalPatterns += template.patterns.length;
            stats.categories[category] = {
                patternCount: template.patterns.length,
                responseLength: template.response.length
            };
        }

        return stats;
    }

    /**
     * BUSCAR TEMPLATES SIMILARES
     * Encuentra templates que podrían ser relevantes pero no hicieron match exacto
     * 
     * @param {string} message - Mensaje del usuario
     * @returns {Array} - Array de posibles matches con menor confianza
     */
    findSimilar(message) {
        const similarities = [];
        const normalizedMessage = message.toLowerCase();

        for (const [category, template] of Object.entries(this.templates)) {
            // Buscar palabras clave en común
            const responseWords = template.response.toLowerCase().split(/\s+/);
            const messageWords = normalizedMessage.split(/\s+/);
            
            const commonWords = messageWords.filter(word => 
                word.length > 3 && responseWords.some(rWord => rWord.includes(word))
            );

            if (commonWords.length > 0) {
                similarities.push({
                    category: category,
                    similarity: commonWords.length / messageWords.length,
                    commonWords: commonWords
                });
            }
        }

        return similarities.sort((a, b) => b.similarity - a.similarity);
    }
}

// Crear instancia singleton
const templateResponses = new TemplateResponses();

module.exports = templateResponses;