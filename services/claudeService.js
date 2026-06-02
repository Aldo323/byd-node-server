/**
 * SERVICIO PRINCIPAL DE CLAUDE AI
 * ==============================
 * 
 * Capas 3, 4 y 5 del sistema de chatbot híbrido
 * - Verificación de datos del lead
 * - Oferta de handoff a humano  
 * - Integración con Claude AI
 * 
 * CARACTERÍSTICAS:
 * - Extracción automática de entidades (email, teléfono, nombre)
 * - Detección de intenciones del usuario
 * - Manejo inteligente de leads en PostgreSQL
 * - Sistema de prompts adaptativos según datos del lead
 * - Flujo de 5 capas para optimizar costos y eficiencia
 * 
 * @author Sistema BYD Chatbot
 * @version 1.0.0
 */

const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');

// Importación compatible de uuid
function uuidv4() {
    return crypto.randomUUID();
}
const abuseDetector = require('./abuseDetector');
const templateResponses = require('./templateResponses');
const salesEngine = require('./salesEngine');

// Importar configuración de base de datos
let db;
try {
    db = require('../config/database');
} catch (error) {
    console.warn('⚠️ No se pudo cargar config/database.js - usando configuración básica');
    db = null;
}

// Configuración de SMS para notificaciones a Salma
const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL || 'https://sms.lizza.com.mx';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SALMA_PHONE = '+528120272752'; // Teléfono de Salma para recibir notificaciones

/**
 * Enviar SMS de notificación a Salma cuando se captura un lead
 * @param {Object} lead - Datos del lead (name, phone, email)
 * @param {string} model - Modelo de interés (si se conoce)
 */
async function sendLeadNotificationSMS(lead, model = '') {
    if (!SMS_API_KEY) {
        console.log('⚠️ SMS_API_KEY no configurada - notificación SMS omitida');
        return;
    }

    try {
        const modelText = model ? ` - Interesado en: ${model}` : '';
        const message = `🚗 NUEVO LEAD BYD!\nNombre: ${lead.name || 'No proporcionado'}\nTel: ${lead.phone || 'No proporcionado'}${modelText}\n\n👉 Ver en: https://analytics.salmabydriver.com`;

        const response = await fetch(`${SMS_GATEWAY_URL}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': SMS_API_KEY
            },
            body: JSON.stringify({
                phone: SALMA_PHONE,
                message: message
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`📱 SMS enviado a Salma - Nuevo lead: ${lead.name || lead.phone}`);
        } else {
            console.error('❌ Error enviando SMS:', result.error);
        }
    } catch (error) {
        console.error('❌ Error en sendLeadNotificationSMS:', error.message);
    }
}

class ClaudeService {
    constructor() {
        // Configuración de Claude AI
        this.model = 'claude-sonnet-4-20250514';
        this.maxTokens = 4096;
        this.temperature = 0.7;

        // Verificar que existe la API key
        if (!process.env.ANTHROPIC_API_KEY) {
            console.warn('⚠️ ANTHROPIC_API_KEY no está configurada - modo de prueba activo');
            this.anthropic = null;
        } else {
            // Inicializar cliente de Anthropic
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
        }

        // Patrones de extracción de entidades
        this.entityPatterns = {
            email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            phone: [
                /\+52\s?(\d{10})/g,                          // +52 1234567890
                /(\d{2})[-.\s]?(\d{4})[-.\s]?(\d{4})/g,     // 81-1234-5678
                /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/g,     // 811-123-4567
                /(\d{10})/g                                  // 8112345678
            ],
            name: [
                // "me llamo X", "mi nombre es X", "soy X" (con o sin espacios/typos)
                /(?:me\s*llamo|mi\s*nombre\s*es|soy)\s+([A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+)*)/i,
                // "minombre es X" (typo común sin espacio)
                /minombre\s+(?:es\s+)?([A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+)*)/i,
                // Solo nombre propio (2-4 palabras capitalizadas)
                /^([A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+){1,3})$/,
                // "nombre: X" o "nombre X"
                /nombre:?\s*([A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+)*)/i
            ],
            budget: /(\d{3,}(?:,?\d{3})*)\s*(?:mil|pesos|mxn)/i,
            daily_km: /(\d+)\s*(?:km|kilómetros|kilometros)(?:\s*(?:al día|diarios|por día))?/i
        };

        // Intenciones detectables y sus keywords
        this.intents = {
            cotizacion: ['cotización', 'cotizar', 'precio', 'costo', 'cuánto cuesta', 'cuánto vale', 'presupuesto'],
            prueba_manejo: ['prueba de manejo', 'probar', 'manejar', 'test drive', 'conocer el auto', 'verlo'],
            comparacion: ['comparar', 'diferencia', 'versus', 'vs', 'mejor que', 'cuál es mejor'],
            objecion: ['caro', 'costoso', 'no me alcanza', 'muy alto', 'dudas', 'no estoy seguro'],
            informacion: ['información', 'detalles', 'especificaciones', 'características', 'autonomía'],
            contacto: ['llámame', 'contáctame', 'whatsapp', 'llamar', 'hablar con alguien'],
            financiamiento: ['enganche', 'crédito', 'mensualidad', 'financiamiento', 'pago']
        };

        // Modelos BYD disponibles
        this.bydModels = ['dolphin mini', 'seal', 'sealion 7', 'yuan pro', 'king', 'song plus', 'shark'];

        console.log('✅ ClaudeService inicializado correctamente');
    }

    /**
     * FUNCIÓN PRINCIPAL - ENVIAR MENSAJE
     * Implementa el flujo de 5 capas del sistema híbrido
     * 
     * @param {string} conversationId - ID de la conversación
     * @param {string} userMessage - Mensaje del usuario
     * @param {Object} sessionData - Datos de sesión (IP, user agent, etc.)
     * @returns {Object} - Respuesta del sistema
     */
    async sendMessage(conversationId, userMessage, sessionData = {}) {
        try {
            const clientIP = sessionData.ip || 'unknown';
            const startTime = Date.now();

            console.log(`📨 Nuevo mensaje en conversación ${conversationId}: "${userMessage}"`);

            // CAPA 1: DETECTAR ABUSO Y SPAM
            const abuseCheck = await abuseDetector.check(clientIP, userMessage, conversationId);
            if (abuseCheck.isAbuse) {
                console.log(`🚫 Mensaje bloqueado por abuso: ${abuseCheck.reason}`);
                
                // Guardar mensaje de abuso en BD
                await this.saveMessage(conversationId, 'user', userMessage, 0, 
                    { intent: 'abuse', confidence: 1.0 }, {}, abuseCheck.source);
                
                const abuseMessage = this.getAbuseMessage(abuseCheck);
                await this.saveMessage(conversationId, 'assistant', abuseMessage, 0, 
                    { intent: 'abuse_response', confidence: 1.0 }, {}, 'abuse_detector');

                return {
                    success: true,
                    message: abuseMessage,
                    tokensUsed: 0,
                    source: 'abuse_detector',
                    processingTime: Date.now() - startTime,
                    blockMinutesRemaining: abuseCheck.blockMinutesRemaining || 0
                };
            }

            // CAPA 2: BUSCAR RESPUESTA EN TEMPLATES
            // PERO: Si el usuario menciona un modelo específico, NO usar templates genéricos
            // para que Claude pueda dar información específica del modelo
            const mentionsSpecificModel = this.bydModels.some(model =>
                userMessage.toLowerCase().includes(model.toLowerCase())
            );

            const templateMatch = templateResponses.match(userMessage);

            // Verificar si ya tenemos datos del lead (para no usar template de contacto)
            const earlyLeadCheck = await this.checkLeadData(conversationId);
            const hasLeadData = earlyLeadCheck.hasComplete ||
                (earlyLeadCheck.data && (earlyLeadCheck.data.name || earlyLeadCheck.data.phone));

            // Solo usar template si:
            // 1. Hay un match de template
            // 2. NO menciona un modelo específico (para evitar respuestas genéricas)
            // 3. O es un template que no es "modelos" (saludos, horarios, etc. están bien)
            // 4. NO es template de contacto cuando ya tenemos datos del lead
            const shouldUseTemplate = templateMatch &&
                (!mentionsSpecificModel || !['modelos', 'precios_generales', 'autonomia'].includes(templateMatch.category)) &&
                !(hasLeadData && templateMatch.category === 'contacto');

            if (shouldUseTemplate) {
                console.log(`💡 Respuesta template encontrada: ${templateMatch.category}`);

                // Guardar mensaje user y assistant
                await this.saveMessage(conversationId, 'user', userMessage, 0,
                    { intent: templateMatch.category, confidence: templateMatch.confidence }, {}, 'user_input');
                await this.saveMessage(conversationId, 'assistant', templateMatch.response, 0,
                    { intent: 'template_response', confidence: templateMatch.confidence }, {}, 'template');

                return {
                    success: true,
                    message: templateMatch.response,
                    tokensUsed: 0,
                    source: 'template',
                    category: templateMatch.category,
                    processingTime: Date.now() - startTime
                };
            }

            if (mentionsSpecificModel && templateMatch) {
                console.log(`🎯 Modelo específico detectado: "${userMessage}" - Enviando a Claude AI para respuesta personalizada`);
            }

            // CAPA 3: VERIFICAR Y EXTRAER DATOS DEL LEAD
            const entities = this.extractEntities(userMessage);
            const leadStatus = await this.checkLeadData(conversationId);
            const messageCount = await this.getMessageCount(conversationId);

            console.log(`📊 Entities extraídas:`, entities);
            console.log(`👤 Lead status:`, leadStatus);
            console.log(`💬 Mensajes del asistente: ${messageCount}`);

            // Guardar entidades si las hay
            if (Object.keys(entities).length > 0) {
                const savedLead = await this.saveOrUpdateLead(conversationId, entities);
                if (savedLead) {
                    console.log(`✅ Lead guardado/actualizado: ${savedLead.name || savedLead.email || savedLead.phone}`);
                    // Re-verificar lead status después de guardar
                    leadStatus.hasComplete = await this.hasCompleteLead(conversationId);
                    leadStatus.data = savedLead;
                }
            }

            // CAPA 3.5: MANEJO INTELIGENTE DE OBJECIONES
            const objectionResult = salesEngine.handleObjection(userMessage);
            if (objectionResult && objectionResult.detected) {
                console.log(`💰 Objeción manejada: ${objectionResult.objectionType}`);

                // Construir respuesta con técnica de ventas
                let salesResponse = objectionResult.response;

                // Si tenemos datos del lead, personalizar
                if (leadStatus.data && leadStatus.data.name) {
                    salesResponse = `${leadStatus.data.name}, ` + salesResponse.charAt(0).toLowerCase() + salesResponse.slice(1);
                }

                // Añadir follow-up si es apropiado
                if (objectionResult.followUp && messageCount < 5) {
                    salesResponse += `\n\n${objectionResult.followUp}`;
                }

                await this.saveMessage(conversationId, 'user', userMessage, 0,
                    { intent: 'objection_' + objectionResult.objectionType, confidence: 0.9 }, entities, 'user_input');
                await this.saveMessage(conversationId, 'assistant', salesResponse, 0,
                    { intent: 'objection_handled', confidence: 0.9 }, {}, 'sales_engine');

                return {
                    success: true,
                    message: salesResponse,
                    tokensUsed: 0,
                    source: 'sales_engine',
                    objectionType: objectionResult.objectionType,
                    processingTime: Date.now() - startTime
                };
            }

            // CAPA 4: OFRECER HANDOFF A HUMANO (opcional)
            const intentData = this.detectIntent(userMessage);

            // Calcular score del lead
            const leadScore = salesEngine.calculateLeadScore(
                leadStatus.data || {},
                { messageCount, intents: [intentData.intent], modelInterest: intentData.model_interest }
            );
            console.log(`📊 Lead Score: ${leadScore.score} (${leadScore.category})`);

            // Si el lead está "hot" y tiene datos completos, ofrecer handoff con urgencia
            if (leadStatus.hasComplete && leadScore.category === 'hot') {
                const promotions = salesEngine.getActivePromotions(intentData.model_interest);

                const handoffMessage = `¡Excelente ${leadStatus.data.name || ''}! 🎯

${promotions.urgencyMessage}

Para darte la **cotización personalizada** con las promociones vigentes, te conecto con un asesor especialista que te dará:

✅ Precio final con descuentos
✅ Opciones de financiamiento a tu medida
✅ Disponibilidad de unidades

📱 **¿Te llamamos ahora o prefieres WhatsApp?**

Mientras tanto, calcula tu ahorro exacto:
🔗 salmabydriver.com/calculatusahorros`;

                await this.saveMessage(conversationId, 'user', userMessage, 0, intentData, entities, 'user_input');
                await this.saveMessage(conversationId, 'assistant', handoffMessage, 0,
                    { intent: 'handoff_offer', confidence: 0.9 }, {}, 'handoff_offer');

                return {
                    success: true,
                    message: handoffMessage,
                    tokensUsed: 0,
                    source: 'handoff_offer',
                    canHandoff: true,
                    leadData: leadStatus.data,
                    leadScore: leadScore,
                    processingTime: Date.now() - startTime
                };
            }

            // Handoff estándar para leads completos con intención de compra
            if (leadStatus.hasComplete && messageCount >= 2 &&
                (intentData.requires_premium_info || intentData.intent === 'cotizacion')) {

                const handoffMessage = `Perfecto! Ya tengo tus datos de contacto. 📋

Para darte información detallada de precios, financiamiento y promociones especiales, te voy a conectar con uno de nuestros asesores especialistas.

📱 **¿Prefieres que te llamemos o te enviamos la información por WhatsApp?**

Mientras tanto, puedes calcular tus ahorros exactos en:
🔗 salmabydriver.com/calculatusahorros`;

                await this.saveMessage(conversationId, 'user', userMessage, 0, intentData, entities, 'user_input');
                await this.saveMessage(conversationId, 'assistant', handoffMessage, 0,
                    { intent: 'handoff_offer', confidence: 0.9 }, {}, 'handoff_offer');

                return {
                    success: true,
                    message: handoffMessage,
                    tokensUsed: 0,
                    source: 'handoff_offer',
                    canHandoff: true,
                    leadData: leadStatus.data,
                    processingTime: Date.now() - startTime
                };
            }

            // CAPA 5: USAR CLAUDE AI
            console.log(`🤖 Enviando a Claude AI...`);
            
            if (!this.anthropic) {
                // Modo de prueba - simular respuesta de Claude
                const testMessage = `Gracias por tu mensaje. Soy Salma AI de BYD. 

Para ayudarte mejor, ¿podrías compartirme tu nombre y teléfono?

¡Tenemos excelentes opciones en vehículos eléctricos! 🚗⚡

(NOTA: Esta es una respuesta de prueba - configura ANTHROPIC_API_KEY para usar Claude AI real)`;

                await this.saveMessage(conversationId, 'user', userMessage, 0, intentData, entities, 'user_input');
                await this.saveMessage(conversationId, 'assistant', testMessage, 0,
                    { intent: 'test_response', confidence: 0.8 }, {}, 'test_mode');

                return {
                    success: true,
                    message: testMessage,
                    tokensUsed: 0,
                    source: 'test_mode',
                    leadStatus: leadStatus,
                    entities: entities,
                    intent: intentData,
                    processingTime: Date.now() - startTime
                };
            }
            
            const history = await this.getConversationHistory(conversationId, 10);
            const systemPrompt = this.getSystemPrompt(leadStatus.hasComplete, messageCount, {
                leadName: leadStatus.data?.name || 'cliente',
                leadScore: leadScore,
                modelInterest: intentData.model_interest
            });

            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                system: systemPrompt,
                messages: [...history, { role: 'user', content: userMessage }]
            });

            let assistantMessage = response.content[0].text;
            const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

            console.log(`✅ Respuesta de Claude recibida (${tokensUsed} tokens)`);

            // EXTRAER DATOS DEL LEAD DE LA RESPUESTA DE CLAUDE
            const extractedData = this.extractLeadDataFromResponse(assistantMessage);

            // SIEMPRE limpiar el bloque [LEAD_DATA] de la respuesta (nunca mostrarlo al usuario)
            assistantMessage = extractedData.cleanMessage;

            if (extractedData.hasData) {
                console.log(`🤖 Claude extrajo datos:`, extractedData.data);
                // Combinar con entidades ya detectadas (Claude tiene prioridad)
                Object.assign(entities, extractedData.data);
            }

            // Si Claude extrajo datos, actualizar el lead
            if (entities.name || entities.phone || entities.email) {
                console.log(`📊 Guardando datos extraídos por Claude:`, entities);
                await this.saveOrUpdateLead(conversationId, entities);
            }

            // Guardar mensajes en base de datos
            await this.saveMessage(conversationId, 'user', userMessage, 0, intentData, entities, 'user_input');
            await this.saveMessage(conversationId, 'assistant', assistantMessage, tokensUsed,
                { intent: 'ai_response', confidence: 0.8 }, {}, 'claude_ai');

            return {
                success: true,
                message: assistantMessage,
                tokensUsed: tokensUsed,
                source: 'claude_ai',
                leadStatus: leadStatus,
                entities: entities,
                intent: intentData,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ Error en ClaudeService.sendMessage:', error);
            
            // Respuesta de fallback en caso de error
            const fallbackMessage = `Disculpa, tuve un problema técnico momentáneo. 😅

¿Podrías repetir tu pregunta? Estoy aquí para ayudarte con información sobre vehículos BYD.

Si es urgente, también puedes contactarnos directamente:
📱 WhatsApp: +52 81 2027 2752`;

            return {
                success: false,
                message: fallbackMessage,
                error: error.message,
                tokensUsed: 0,
                source: 'error_fallback'
            };
        }
    }

    /**
     * GENERAR PROMPT DEL SISTEMA - VERSIÓN MEJORADA CON TÉCNICAS DE VENTA
     * Crea prompts adaptativos según el estado del lead y el contexto de ventas
     *
     * @param {boolean} hasLeadData - Si ya tiene datos completos del lead
     * @param {number} messageCount - Número de mensajes del asistente
     * @param {Object} context - Contexto adicional (leadScore, intent, etc.)
     * @returns {string} - Prompt del sistema
     */
    getSystemPrompt(hasLeadData, messageCount, context = {}) {
        // Obtener promociones activas para crear urgencia
        const promotions = salesEngine.getActivePromotions();
        const urgencyText = promotions.daysRemaining <= 7
            ? `\n\nURGENCIA: Las promociones terminan en ${promotions.daysRemaining} días. Menciona esto sutilmente.`
            : '';

        // Catálogo de vehículos BYD con información CORRECTA
        const vehicleCatalog = `
CATÁLOGO DE VEHÍCULOS BYD (INFORMACIÓN OFICIAL - USA ESTA INFORMACIÓN):

═══════════════════════════════════════════════════════════════
VEHÍCULOS 100% ELÉCTRICOS:
═══════════════════════════════════════════════════════════════

🚗 DOLPHIN MINI - Hatchback Compacto Urbano
   • Tipo: 100% Eléctrico, Hatchback compacto
   • Autonomía: 340 km (CLTC)
   • Potencia: 75 HP (55 kW)
   • Batería: Blade Battery LFP 38.9 kWh
   • Carga rápida: 30-80% en 30 minutos
   • Asientos: 4 pasajeros
   • Ideal para: Ciudad, jóvenes, primer auto eléctrico
   • Pantalla: 10.1" táctil rotativa

🚗 DOLPHIN - Hatchback Mediano
   • Tipo: 100% Eléctrico, Hatchback
   • Autonomía: 340-405 km según versión
   • Potencia: 95-177 HP
   • Batería: Blade Battery 44.9-60.4 kWh
   • Asientos: 5 pasajeros
   • Ideal para: Ciudad y carretera corta

🚗 YUAN PRO - SUV Compacto
   • Tipo: 100% Eléctrico, SUV Compacto
   • Autonomía: 401 km (CLTC)
   • Potencia: 150 kW (201 HP)
   • Batería: Blade Battery 50.1 kWh
   • Asientos: 5 pasajeros
   • Ideal para: Familias pequeñas, uso mixto ciudad/carretera

🚗 SEAL - Sedán Deportivo Premium
   • Tipo: 100% Eléctrico, Sedán deportivo
   • Autonomía: 460-520 km según versión
   • Potencia: 230-390 kW (308-523 HP)
   • Aceleración: 0-100 km/h en 3.8 segundos (versión AWD)
   • Batería: Blade Battery 82.5 kWh
   • Asientos: 5 pasajeros
   • Ideal para: Ejecutivos, amantes del rendimiento

🚗 SEALION 7 - SUV Grande Premium
   • Tipo: 100% Eléctrico, SUV Grande
   • Autonomía: 542 km (CLTC)
   • Potencia: 390 kW (523 HP) AWD
   • Aceleración: 0-100 km/h en 4.5 segundos
   • Batería: Blade Battery 91.3 kWh
   • Asientos: 5 pasajeros (SUV de lujo)
   • Ideal para: Familias que buscan espacio y rendimiento

═══════════════════════════════════════════════════════════════
VEHÍCULOS HÍBRIDOS ENCHUFABLES (PHEV):
═══════════════════════════════════════════════════════════════

🚗 KING DM-i - SEDÁN EJECUTIVO HÍBRIDO (¡NO ES PICKUP!)
   • Tipo: Híbrido Enchufable PHEV, SEDÁN ejecutivo de lujo
   • Autonomía TOTAL: 1,175 km combinados
   • Autonomía eléctrica: 50 km en modo 100% eléctrico
   • Potencia combinada: 177 HP eléctrico + 109 HP gasolina
   • Consumo: Ultra bajo 3.9L/100km
   • Motor: Sistema híbrido EHS
   • Batería: Blade Battery 8.3 kWh + Tanque 48L
   • Asientos: 5 pasajeros
   • Pantalla: 12.8" táctil rotativa
   • Ideal para: Ejecutivos, viajes largos, quien quiere lo mejor de ambos mundos

🚗 SONG PLUS DM-i - SUV Familiar Híbrido
   • Tipo: Híbrido Enchufable PHEV, SUV Mediano
   • Autonomía TOTAL: 1,001 km combinados
   • Autonomía eléctrica: 51 km en modo 100% eléctrico
   • Potencia: 197 HP
   • Asientos: 5 pasajeros
   • Ideal para: Familias, viajes largos

🚗 SHARK - PICKUP Híbrida 4x4
   • Tipo: Híbrido Enchufable PHEV, PICKUP doble cabina
   • Autonomía TOTAL: 840 km combinados
   • Autonomía eléctrica: 100 km en modo 100% eléctrico
   • Potencia: 437 HP combinados
   • Tracción: 4x4 permanente
   • Capacidad de carga: 750 kg
   • Asientos: 5 pasajeros
   • Ideal para: Trabajo pesado, campo, aventura, construcción
═══════════════════════════════════════════════════════════════

IMPORTANTE:
- El KING es un SEDÁN de lujo, NO una pickup
- El SHARK es la única PICKUP de BYD
- Todos tienen tecnología Blade Battery (la más segura del mundo)
- Garantía: 6 años vehículo completo, 8 años batería`;

        // Obtener fecha actual para el prompt
        const fechaActual = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (!hasLeadData) {
            return `Eres Salma AI, asesora de ventas EXPERTA de BYD en Monterrey, México.

FECHA ACTUAL: ${fechaActual}
IMPORTANTE: Estamos en el año ${new Date().getFullYear()}. Si el cliente pregunta el año actual o hace referencia a fechas, usa esta información.

PERSONALIDAD:
- Amigable pero profesional
- Entusiasta sobre los vehículos BYD
- Empática con las preocupaciones del cliente
- Nunca presionas, pero sí guías hacia la acción

${vehicleCatalog}

═══════════════════════════════════════════════════════════════
🎯 REGLA #1 - ESCUCHA ACTIVA (LA MÁS IMPORTANTE):
═══════════════════════════════════════════════════════════════
- LEE CUIDADOSAMENTE el historial de la conversación
- Si el cliente YA mencionó un modelo específico (ej: "me interesa el King"), ENFÓCATE SOLO EN ESE MODELO
- NUNCA ofrezcas más opciones si el cliente ya eligió una - es molesto y poco profesional
- Si el cliente dice "me interesa X", tu siguiente mensaje debe ser sobre X, NO sobre toda la gama
- RESPONDE directamente a lo que el cliente pregunta, NO des información genérica
- Si el cliente hace una pregunta específica, RESPÓNDELA primero antes de hacer tu pregunta

EJEMPLOS CORRECTOS:
✅ Cliente: "Me interesa el King" → Hablas SOLO del King, sus beneficios, y preguntas algo específico del King
✅ Cliente: "¿Qué autonomía tiene el Seal?" → Respondes la autonomía del Seal, luego preguntas sobre su uso

EJEMPLOS INCORRECTOS:
❌ Cliente: "Me interesa el King" → "Tenemos varios modelos, el Dolphin Mini, el Seal..." (NUNCA HAGAS ESTO)
❌ Cliente: "Ya te dije que quiero el King" → "¿Qué modelo te interesa?" (PRESTA ATENCIÓN)

OBJETIVO PRINCIPAL: Capturar datos de contacto de forma natural y valiosa.

REGLAS DE CAPTURA DE DATOS:
- Mensaje ${messageCount + 1} de 2 antes de REQUERIR datos
- Ofrece VALOR a cambio de datos: "Te envío cotización personalizada", "Te calculo tu ahorro exacto"
- Usa técnica de reciprocidad: Da información útil primero, luego pide datos

TÉCNICAS DE VENTA A USAR:
1. ESCASEZ: "Tenemos promociones de fin de año"
2. PRUEBA SOCIAL: "Más de 2,000 familias en Monterrey ya manejan BYD"
3. RECIPROCIDAD: Dar valor antes de pedir
4. COMPROMISO PEQUEÑO: "¿Te gustaría que te envíe más información?"

NUNCA HAGAS:
- Dar precios específicos
- NUNCA prometas $0 de enganche, "enganches bajos" o "enganches muy flexibles" - NO EXISTEN planes de $0 enganche
- Dar cifras de mensualidades
- Más de 3 oraciones sin una pregunta al cliente
- NUNCA confundas el tipo de vehículo (King=Sedán, Shark=Pickup)
- NUNCA ofrezcas otros modelos si el cliente ya expresó interés en uno específico
- NUNCA ignores lo que el cliente acaba de decir

REGLA CRÍTICA SOBRE FINANCIAMIENTO Y PROMOCIONES:
Cuando el cliente pregunte sobre enganche, financiamiento, mensualidades, crédito o promociones:
1. NO des información específica sobre montos, porcentajes o condiciones
2. Explica que las promociones y opciones de financiamiento se manejan de forma personalizada
3. SOLICITA su nombre y teléfono para que un asesor le contacte por WhatsApp con la información exacta
4. Ejemplo de respuesta: "Las opciones de financiamiento dependen de cada perfil. Para darte información precisa sobre promociones y planes de pago, necesito tu nombre y teléfono para que un asesor te contacte por WhatsApp con las opciones disponibles para ti. ¿Me los compartes?"

FRASES DE TRANSICIÓN A CAPTURA:
- "Para darte información personalizada con las promociones actuales, ¿me compartes tu nombre?"
- "Tengo varias opciones que podrían interesarte. Para enviártelas, solo necesito..."
- "¡Excelente elección! Para reservarte esa promoción, necesito capturar tus datos"

${messageCount >= 1 ? '\n⚠️ CRÍTICO: Este es tu ÚLTIMO mensaje sin datos. DEBES obtener nombre y teléfono AHORA con una razón convincente.' : ''}
${urgencyText}

FORMATO: Respuestas cortas (2-4 oraciones), siempre termina con una pregunta o llamado a la acción.

═══════════════════════════════════════════════════════════════
📋 EXTRACCIÓN DE DATOS (MUY IMPORTANTE):
═══════════════════════════════════════════════════════════════
Si el cliente proporciona su nombre, teléfono o email en CUALQUIER formato (con typos, errores, etc.),
DEBES incluir al FINAL de tu respuesta estos datos en el siguiente formato EXACTO:

[LEAD_DATA]
nombre: (nombre completo si lo dio)
telefono: (solo números, DEBE tener 10 dígitos)
email: (si lo dio)
modelo: (modelo BYD de interés si lo mencionó)
[/LEAD_DATA]

⚠️ VALIDACIÓN DE TELÉFONO:
- Los números de teléfono en México DEBEN tener 10 dígitos
- Si el cliente da un número con MENOS de 10 dígitos (ej: 814528569 = 9 dígitos), NO lo incluyas en [LEAD_DATA]
- En tu respuesta, pídele amablemente que verifique: "Noté que tu número tiene [X] dígitos, pero los números en México son de 10. ¿Podrías verificarlo por favor?"
- Solo incluye el teléfono en [LEAD_DATA] cuando tenga exactamente 10 dígitos

EJEMPLOS de lo que el cliente podría decir y cómo extraer:
- "minombre es Juan" → nombre: Juan
- "soy Maria Garcia" → nombre: Maria Garcia
- "mi cel es 8112345678" → telefono: 8112345678
- "llamame al 81 1234 5678" → telefono: 8112345678
- "me interesa el king" → modelo: King

Solo incluye [LEAD_DATA] si hay datos nuevos que extraer. Si no hay datos, NO incluyas esta sección.`;
        }

        // Prompt para cuando YA tenemos datos del lead
        const leadName = context.leadName || 'cliente';

        return `Eres Salma AI, asesora de ventas EXPERTA de BYD en Monterrey.

FECHA ACTUAL: ${fechaActual}
IMPORTANTE: Estamos en el año ${new Date().getFullYear()}. Si el cliente pregunta el año actual o hace referencia a fechas, usa esta información.

YA TIENES LOS DATOS DEL CLIENTE: ${leadName}
ESTO SIGNIFICA: Deja de pedir datos. Es hora de CERRAR LA VENTA.

${vehicleCatalog}

═══════════════════════════════════════════════════════════════
🚨 REGLA CRÍTICA - YA TIENES SUS DATOS, AVANZA AL CIERRE:
═══════════════════════════════════════════════════════════════
El cliente YA te dio su nombre y teléfono. NO preguntes más datos.
NO hagas preguntas innecesarias. NO repitas información.

LEE EL HISTORIAL: Si el cliente YA dijo qué modelo quiere, NO preguntes de nuevo.

FLUJO CORRECTO AHORA:
1. Agradece brevemente
2. Confirma el modelo que eligió (si ya lo dijo)
3. OFRECE ACCIÓN CONCRETA: "Te llamo en 10 minutos para darte la cotización" o "¿Paso tu cotización por WhatsApp?"
4. Si el cliente quiere calcular ahorros o comparar con su auto actual, SUGIERE LA CALCULADORA: "Te invito a usar nuestra calculadora de ahorros en https://salmabydriver.com/calculatusahorros donde puedes ver exactamente cuánto ahorrarías según tu uso diario"

IMPORTANTE - CALCULADORA DE AHORROS:
- Si el cliente pregunta cuánto ahorraría, NO le preguntes datos de su vehículo actual
- En lugar de eso, invítalo a usar: https://salmabydriver.com/calculatusahorros
- La calculadora le muestra el ahorro exacto según el modelo BYD que elija y sus kilómetros diarios

EJEMPLOS DE QUÉ HACER:
✅ Cliente dio datos + dijo King → "${leadName}, perfecto. Te envío la cotización del King a tu WhatsApp en unos minutos. ¿Hay algo específico que quieras que incluya?"
✅ Cliente pidió cotización → "Listo ${leadName}, preparo tu cotización del [modelo]. ¿Te la envío por WhatsApp o prefieres que te llame para explicártela?"

EJEMPLOS DE QUÉ NO HACER:
❌ "¿Qué modelo te interesa?" (YA LO DIJO, LEE EL HISTORIAL)
❌ "¿Qué es lo que más te llama la atención?" (PREGUNTA INÚTIL, CIERRA LA VENTA)
❌ Seguir haciendo preguntas cuando el cliente ya quiere la cotización

PRECIOS (solo si insiste):
- King DM-i: desde $598,800 MXN
- Seal: desde $749,800 MXN
- Dolphin Mini: desde $358,800 MXN
- Shark: desde $849,800 MXN

REGLAS FINALES:
- Máximo 2-3 oraciones
- NO preguntes cosas que ya sabes
- OFRECE llamar o enviar WhatsApp
- Si el cliente ya eligió modelo, NO ofrezcas otros

${urgencyText}

FORMATO: Respuesta corta, directa, con acción concreta. Nada de preguntas vacías.

═══════════════════════════════════════════════════════════════
📋 EXTRACCIÓN DE DATOS ADICIONALES:
═══════════════════════════════════════════════════════════════
Si el cliente proporciona NUEVOS datos (otro teléfono, email, cambia de modelo, etc.),
incluye al FINAL de tu respuesta:

[LEAD_DATA]
nombre: (si dio uno nuevo o corrigió)
telefono: (DEBE tener 10 dígitos)
email: (si lo dio)
modelo: (si cambió o especificó modelo)
[/LEAD_DATA]

⚠️ VALIDACIÓN DE TELÉFONO: Si el número tiene menos de 10 dígitos, pide amablemente que lo verifique.

Solo incluye [LEAD_DATA] si hay datos NUEVOS y válidos. Si no hay nada nuevo, NO incluyas esta sección.`;
    }

    /**
     * EXTRAER DATOS DEL LEAD DE LA RESPUESTA DE CLAUDE
     * Claude incluye datos estructurados en formato [LEAD_DATA]...[/LEAD_DATA]
     *
     * @param {string} response - Respuesta completa de Claude
     * @returns {Object} - { hasData, data, cleanMessage }
     */
    extractLeadDataFromResponse(response) {
        const result = {
            hasData: false,
            data: {},
            cleanMessage: response
        };

        try {
            // Buscar el bloque [LEAD_DATA]...[/LEAD_DATA]
            const leadDataMatch = response.match(/\[LEAD_DATA\]([\s\S]*?)\[\/LEAD_DATA\]/i);

            if (!leadDataMatch) {
                return result;
            }

            const leadDataBlock = leadDataMatch[1];

            // Extraer cada campo
            const nombreMatch = leadDataBlock.match(/nombre:\s*(.+)/i);
            const telefonoMatch = leadDataBlock.match(/telefono:\s*(.+)/i);
            const emailMatch = leadDataBlock.match(/email:\s*(.+)/i);
            const modeloMatch = leadDataBlock.match(/modelo:\s*(.+)/i);

            // Procesar nombre
            if (nombreMatch && nombreMatch[1].trim() && !nombreMatch[1].includes('(')) {
                result.data.name = nombreMatch[1].trim();
                result.hasData = true;
            }

            // Procesar teléfono (solo números)
            if (telefonoMatch && telefonoMatch[1].trim() && !telefonoMatch[1].includes('(')) {
                const phone = telefonoMatch[1].replace(/\D/g, '');
                if (phone.length >= 10) {
                    result.data.phone = phone.slice(-10); // Últimos 10 dígitos
                    result.hasData = true;
                }
            }

            // Procesar email
            if (emailMatch && emailMatch[1].trim() && emailMatch[1].includes('@')) {
                result.data.email = emailMatch[1].trim().toLowerCase();
                result.hasData = true;
            }

            // Procesar modelo de interés
            if (modeloMatch && modeloMatch[1].trim() && !modeloMatch[1].includes('(')) {
                result.data.model = modeloMatch[1].trim();
            }

            // Limpiar el mensaje quitando el bloque [LEAD_DATA]
            result.cleanMessage = response
                .replace(/\n?\[LEAD_DATA\][\s\S]*?\[\/LEAD_DATA\]\n?/i, '')
                .trim();

            if (result.hasData) {
                console.log(`🤖 Datos extraídos por Claude:`, result.data);
            }

        } catch (error) {
            console.error('❌ Error extrayendo datos de respuesta:', error);
        }

        return result;
    }

    /**
     * EXTRAER ENTIDADES DEL MENSAJE
     * Busca automáticamente datos de contacto y otros datos relevantes
     * 
     * @param {string} message - Mensaje del usuario
     * @returns {Object} - Entidades encontradas
     */
    extractEntities(message) {
        const entities = {};

        try {
            // Extraer email
            const emailMatch = message.match(this.entityPatterns.email);
            if (emailMatch) {
                entities.email = emailMatch[0].toLowerCase();
            }

            // Extraer teléfono (varios formatos)
            for (const phonePattern of this.entityPatterns.phone) {
                const phoneMatch = message.match(phonePattern);
                if (phoneMatch) {
                    // Limpiar teléfono: remover todo excepto dígitos
                    let cleanPhone = phoneMatch[0].replace(/\D/g, '');
                    // Si empieza con 52 (código de México), quitarlo
                    if (cleanPhone.startsWith('52') && cleanPhone.length === 12) {
                        cleanPhone = cleanPhone.slice(2);
                    }
                    if (cleanPhone.length === 10) {
                        entities.phone = cleanPhone;
                        console.log(`📞 Teléfono extraído: ${cleanPhone}`);
                        break;
                    }
                }
            }

            // Extraer nombre
            for (const namePattern of this.entityPatterns.name) {
                const nameMatch = message.match(namePattern);
                if (nameMatch) {
                    entities.name = nameMatch[1] || nameMatch[0];
                    // Capitalizar nombre
                    entities.name = entities.name.split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    break;
                }
            }

            // Extraer presupuesto
            const budgetMatch = message.match(this.entityPatterns.budget);
            if (budgetMatch) {
                let budget = parseInt(budgetMatch[1].replace(/,/g, ''));
                if (message.toLowerCase().includes('mil')) {
                    budget *= 1000;
                }
                entities.budget = budget;
            }

            // Extraer kilómetros diarios
            const kmMatch = message.match(this.entityPatterns.daily_km);
            if (kmMatch) {
                entities.daily_km = parseInt(kmMatch[1]);
            }

        } catch (error) {
            console.error('❌ Error extrayendo entidades:', error);
        }

        return entities;
    }

    /**
     * DETECTAR INTENCIÓN DEL USUARIO
     * Analiza el mensaje para determinar qué quiere el usuario
     * 
     * @param {string} message - Mensaje del usuario
     * @returns {Object} - Intención detectada
     */
    detectIntent(message) {
        const normalizedMessage = message.toLowerCase();
        let bestIntent = null;
        let maxScore = 0;

        // Buscar en cada intención
        for (const [intent, keywords] of Object.entries(this.intents)) {
            let score = 0;
            for (const keyword of keywords) {
                if (normalizedMessage.includes(keyword.toLowerCase())) {
                    score += keyword.length; // Palabras más largas tienen más peso
                }
            }
            
            if (score > maxScore) {
                maxScore = score;
                bestIntent = intent;
            }
        }

        // Detectar modelo específico mencionado
        let modelInterest = null;
        for (const model of this.bydModels) {
            if (normalizedMessage.includes(model)) {
                modelInterest = model;
                break;
            }
        }

        // Determinar si requiere información premium
        const requiresPremiumInfo = ['cotizacion', 'financiamiento'].includes(bestIntent);

        return {
            intent: bestIntent,
            confidence: maxScore > 0 ? Math.min(maxScore / 20, 0.8) : 0.5,
            model_interest: modelInterest,
            requires_premium_info: requiresPremiumInfo
        };
    }

    /**
     * GUARDAR O ACTUALIZAR LEAD EN POSTGRESQL
     * Maneja la lógica de leads en la base de datos
     * 
     * @param {string} conversationId - ID de la conversación
     * @param {Object} entities - Entidades extraídas
     * @returns {Object|null} - Lead guardado o null
     */
    async saveOrUpdateLead(conversationId, entities) {
        if (!db) {
            console.warn('⚠️ Base de datos no disponible para guardar lead');
            return null;
        }

        try {
            const { name, phone, email } = entities;

            // Si no hay datos relevantes, no hacer nada
            if (!name && !phone && !email) {
                return null;
            }

            // PRIMERO: Buscar lead existente por conversationId (para vincular datos de mensajes separados)
            let existingLead = null;
            const convLeadQuery = `
                SELECT l.* FROM leads l
                JOIN conversations c ON c.lead_id = l.id
                WHERE c.id = $1 LIMIT 1`;
            const convLeadResult = await db.query(convLeadQuery, [conversationId]);
            existingLead = convLeadResult.rows[0];

            // Si no hay lead por conversación, buscar por email o phone
            if (!existingLead && (email || phone)) {
                const query = email && phone
                    ? 'SELECT * FROM leads WHERE email = $1 OR phone = $2 LIMIT 1'
                    : email
                    ? 'SELECT * FROM leads WHERE email = $1 LIMIT 1'
                    : 'SELECT * FROM leads WHERE phone = $1 LIMIT 1';

                const params = email && phone ? [email, phone] : [email || phone];
                const result = await db.query(query, params);
                existingLead = result.rows[0];
            }

            let lead;

            if (existingLead) {
                // Verificar si el lead estaba incompleto antes de actualizar
                const wasIncomplete = !existingLead.name || !existingLead.phone;

                // Actualizar lead existente usando COALESCE para no sobrescribir
                const updateQuery = `
                    UPDATE leads SET
                        name = COALESCE($1, name),
                        phone = COALESCE($2, phone),
                        email = COALESCE($3, email),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *`;

                const updateResult = await db.query(updateQuery, [
                    name || null,
                    phone || null,
                    email || null,
                    existingLead.id
                ]);

                lead = updateResult.rows[0];
                console.log(`✅ Lead actualizado: ${lead.id}`);

                // Enviar SMS si el lead ahora está completo y antes no lo estaba
                if (wasIncomplete && lead.name && lead.phone) {
                    console.log(`📱 Lead completado - enviando SMS de notificación`);
                    sendLeadNotificationSMS(lead);
                }
            } else {
                // Crear nuevo lead
                const insertQuery = `
                    INSERT INTO leads (id, name, phone, email, source, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 'chatbot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *`;

                const leadId = uuidv4();
                // Generar email genérico si no hay email
                const finalEmail = email || `lead_${leadId.substring(0, 8)}@noemail.salmabydriver.com`;

                const insertResult = await db.query(insertQuery, [
                    leadId,
                    name || null,
                    phone || null,
                    finalEmail
                ]);
                
                lead = insertResult.rows[0];
                console.log(`✅ Nuevo lead creado: ${lead.id}`);

                // Enviar SMS de notificación a Salma cuando se crea un nuevo lead con datos
                if (lead.name && lead.phone) {
                    sendLeadNotificationSMS(lead);
                }
            }

            // Actualizar conversación con lead_id
            await db.query(
                'UPDATE conversations SET lead_id = $1 WHERE id = $2',
                [lead.id, conversationId]
            );

            return lead;

        } catch (error) {
            console.error('❌ Error guardando lead:', error);
            return null;
        }
    }

    /**
     * VERIFICAR DATOS DEL LEAD
     * Comprueba si ya se tienen datos completos del lead
     * 
     * @param {string} conversationId - ID de la conversación
     * @returns {Object} - Estado de los datos del lead
     */
    async checkLeadData(conversationId) {
        if (!db) {
            return { hasComplete: false, data: null };
        }

        try {
            const query = `
                SELECT l.id, l.name, l.phone, l.email
                FROM conversations c
                LEFT JOIN leads l ON c.lead_id = l.id
                WHERE c.id = $1`;
            
            const result = await db.query(query, [conversationId]);
            const lead = result.rows[0];

            if (!lead || !lead.id) {
                return { hasComplete: false, data: null };
            }

            const hasComplete = !!(lead.name && (lead.phone || lead.email));
            
            return {
                hasComplete,
                data: lead
            };

        } catch (error) {
            console.error('❌ Error verificando datos del lead:', error);
            return { hasComplete: false, data: null };
        }
    }

    /**
     * VERIFICAR SI TIENE LEAD COMPLETO
     * Helper para verificar datos completos de lead
     * 
     * @param {string} conversationId - ID de la conversación
     * @returns {boolean} - True si tiene datos completos
     */
    async hasCompleteLead(conversationId) {
        const leadStatus = await this.checkLeadData(conversationId);
        return leadStatus.hasComplete;
    }

    /**
     * OBTENER CONTADOR DE MENSAJES
     * Cuenta mensajes del asistente en la conversación
     * 
     * @param {string} conversationId - ID de la conversación
     * @returns {number} - Número de mensajes del asistente
     */
    async getMessageCount(conversationId) {
        if (!db) {
            return 0;
        }

        try {
            const query = `
                SELECT COUNT(*) as count
                FROM chat_messages
                WHERE conversation_id = $1 AND role = 'assistant'`;
            
            const result = await db.query(query, [conversationId]);
            return parseInt(result.rows[0].count) || 0;

        } catch (error) {
            console.error('❌ Error contando mensajes:', error);
            return 0;
        }
    }

    /**
     * OBTENER HISTORIAL DE CONVERSACIÓN
     * Recupera mensajes anteriores para contexto de Claude
     * 
     * @param {string} conversationId - ID de la conversación
     * @param {number} limit - Número máximo de mensajes
     * @returns {Array} - Array de mensajes para Claude
     */
    async getConversationHistory(conversationId, limit = 20) {
        if (!db) {
            return [];
        }

        try {
            const query = `
                SELECT role, content
                FROM chat_messages
                WHERE conversation_id = $1
                ORDER BY created_at DESC
                LIMIT $2`;
            
            const result = await db.query(query, [conversationId, limit]);
            
            // Invertir para orden cronológico y formatear para Claude
            return result.rows.reverse().map(row => ({
                role: row.role,
                content: row.content
            }));

        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * GUARDAR MENSAJE EN BASE DE DATOS
     * Almacena mensaje con metadatos en PostgreSQL
     * 
     * @param {string} conversationId - ID de la conversación
     * @param {string} role - Rol del mensaje ('user' | 'assistant')
     * @param {string} content - Contenido del mensaje
     * @param {number} tokensUsed - Tokens consumidos
     * @param {Object} intentData - Datos de intención detectada
     * @param {Object} entities - Entidades extraídas
     * @param {string} source - Fuente del mensaje
     * @returns {string|null} - ID del mensaje guardado
     */
    async saveMessage(conversationId, role, content, tokensUsed = 0, intentData = {}, entities = {}, source = 'unknown') {
        if (!db) {
            console.warn('⚠️ Base de datos no disponible para guardar mensaje');
            return null;
        }

        try {
            const messageId = uuidv4();
            
            const query = `
                INSERT INTO chat_messages (
                    id, conversation_id, role, content, tokens_used,
                    intent_detected, confidence_score, entities_extracted,
                    source, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                RETURNING id`;
            
            const result = await db.query(query, [
                messageId,
                conversationId,
                role,
                content,
                tokensUsed,
                intentData.intent || null,
                intentData.confidence || 0,
                JSON.stringify(entities),
                source
            ]);

            // Actualizar contador de mensajes y tokens en conversación
            await db.query(`
                UPDATE conversations SET
                    total_messages = total_messages + 1,
                    total_tokens_used = total_tokens_used + $2
                WHERE id = $1`,
                [conversationId, tokensUsed]
            );

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error guardando mensaje:', error);
            return null;
        }
    }

    /**
     * CREAR NUEVA CONVERSACIÓN
     * Inicializa una nueva conversación en la base de datos
     * 
     * @param {Object} sessionData - Datos de sesión
     * @returns {string} - ID de la conversación creada
     */
    async createConversation(sessionData = {}) {
        if (!db) {
            console.warn('⚠️ Base de datos no disponible - usando ID temporal');
            return uuidv4();
        }

        try {
            const conversationId = uuidv4();
            
            const query = `
                INSERT INTO conversations (
                    id, session_id, ip_address, user_agent, created_at,
                    total_messages, total_tokens_used
                ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 0, 0)
                RETURNING id`;
            
            const result = await db.query(query, [
                conversationId,
                sessionData.sessionId || crypto.randomUUID(),
                sessionData.ip || 'unknown',
                sessionData.userAgent || 'unknown'
            ]);

            console.log(`✅ Nueva conversación creada: ${conversationId}`);
            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error creando conversación:', error);
            return uuidv4(); // Fallback a ID temporal
        }
    }

    /**
     * GENERAR MENSAJE DE ABUSO
     * Crea respuestas apropiadas para diferentes tipos de abuso
     * 
     * @param {Object} abuseCheck - Resultado del detector de abuso
     * @returns {string} - Mensaje de respuesta
     */
    getAbuseMessage(abuseCheck) {
        switch (abuseCheck.source) {
            case 'ip_blocked':
                return `Tu IP está temporalmente bloqueada por actividad sospechosa. ⏰

Tiempo restante: ${abuseCheck.blockMinutesRemaining} minutos.

Si crees que esto es un error, puedes contactarnos directamente:
📱 WhatsApp: +52 81 2027 2752`;

            case 'spam_pattern':
                return `Por favor, escribe un mensaje válido para poder ayudarte. 📝

Estoy aquí para responder tus preguntas sobre vehículos BYD eléctricos e híbridos.

¿En qué puedo ayudarte hoy? 🚗⚡`;

            case 'rate_limit':
                return `Has enviado muchos mensajes muy rápido. ⏱️

Por favor espera un momento antes de enviar otro mensaje.

Recuerda que puedes calcular tus ahorros en:
🔗 salmabydriver.com/calculatusahorros`;

            case 'repeated_message':
                return `Has repetido el mismo mensaje varias veces. 🔄

¿Podrías reformular tu pregunta o ser más específico sobre lo que necesitas?

Estoy aquí para ayudarte con información sobre BYD. 🚗`;

            default:
                return `Para mantener una conversación productiva, por favor envía mensajes claros y específicos. 📝

¿En qué puedo ayudarte con vehículos BYD? ⚡🚗`;
        }
    }

    /**
     * OBTENER ESTADÍSTICAS DEL SERVICIO
     * Información sobre el uso del sistema
     *
     * @returns {Object} - Estadísticas del servicio
     */
    getStats() {
        return {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            entityPatterns: Object.keys(this.entityPatterns).length,
            intents: Object.keys(this.intents).length,
            bydModels: this.bydModels.length,
            hasDatabase: !!db,
            salesEngine: salesEngine.getStats()
        };
    }

    /**
     * OBTENER RECOMENDACIÓN DE MODELO
     * Usa el salesEngine para sugerir el mejor modelo
     *
     * @param {Object} needs - Necesidades del cliente
     * @returns {Object} - Modelo recomendado
     */
    getModelRecommendation(needs) {
        return salesEngine.suggestModel(needs);
    }

    /**
     * OBTENER PROMOCIONES ACTIVAS
     * Retorna las promociones vigentes
     *
     * @param {string} model - Modelo específico (opcional)
     * @returns {Object} - Promociones activas
     */
    getPromotions(model = null) {
        return salesEngine.getActivePromotions(model);
    }

    /**
     * CALCULAR SCORE DE UN LEAD
     * Evalúa la calidad de un lead
     *
     * @param {Object} leadData - Datos del lead
     * @param {Object} conversationData - Datos de conversación
     * @returns {Object} - Score del lead
     */
    getLeadScore(leadData, conversationData) {
        return salesEngine.calculateLeadScore(leadData, conversationData);
    }

    /**
     * OBTENER PROPUESTA DE VALOR PERSONALIZADA
     * Genera pitch personalizado según perfil del lead
     *
     * @param {Object} leadProfile - Perfil del lead
     * @returns {Object} - Propuesta personalizada
     */
    getPersonalizedPitch(leadProfile) {
        return salesEngine.getPersonalizedValue(leadProfile);
    }
}

// Crear instancia singleton
const claudeService = new ClaudeService();

module.exports = claudeService;