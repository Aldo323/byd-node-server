# 🤖 SISTEMA DE CHATBOT INTELIGENTE BYD

## 📖 Descripción

Sistema de chatbot híbrido de 5 capas diseñado para optimizar costos y maximizar la eficiencia en la captura de leads para BYD.

### 🏗️ Arquitectura del Sistema (5 Capas)

1. **🚫 Capa 1: Detector de Abuso** - Protección contra spam y rate limiting
2. **💡 Capa 2: Respuestas Template** - Respuestas instantáneas (0 tokens)
3. **👤 Capa 3: Verificación de Leads** - Extracción y validación de datos
4. **🤝 Capa 4: Handoff a Humanos** - Transferencia inteligente
5. **🧠 Capa 5: Claude AI** - Inteligencia artificial avanzada

## 📁 Archivos Creados

```
services/
├── abuseDetector.js       # Capa 1: Detección de spam y rate limiting
├── templateResponses.js   # Capa 2: Respuestas pre-programadas
└── claudeService.js       # Capas 3-5: IA y manejo de leads

database/
└── chatbot_tables.sql     # Tablas PostgreSQL necesarias

test_chatbot.js           # Script de pruebas del sistema
CHATBOT_README.md         # Esta documentación
```

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Agregar al archivo `.env`:

```bash
# Claude AI
ANTHROPIC_API_KEY=tu_api_key_de_claude_aqui

# PostgreSQL (ya configuradas)
DB_HOST=postgres-byd
DB_PORT=5432
DB_DATABASE=byd_calculator_db
DB_USER=postgres
DB_PASSWORD=Ant_2019.
```

### 2. Dependencias NPM

Ya instaladas automáticamente:
- `@anthropic-ai/sdk` - Cliente oficial de Claude AI
- `uuid` - Generación de UUIDs

### 3. Base de Datos

Ejecutar el script SQL para crear las tablas:

```bash
# Con Docker Compose ejecutándose
docker exec -i postgres-byd psql -U postgres -d byd_calculator_db < database/chatbot_tables.sql
```

O directamente con psql:

```bash
psql -h localhost -U postgres -d byd_calculator_db -f database/chatbot_tables.sql
```

## 🧪 Pruebas del Sistema

Ejecutar las pruebas para verificar que todo funcione:

```bash
node test_chatbot.js
```

### Resultados Esperados:
- ✅ Detección de spam y rate limiting
- ✅ Matching de respuestas template
- ✅ Extracción de entidades (email, teléfono, nombre)
- ✅ Detección de intenciones
- ✅ Sistema de prompts adaptativos
- ✅ Estadísticas de servicios

## 🚀 Integración en server.js

### Importar Servicios

```javascript
const claudeService = require('./services/claudeService');
const abuseDetector = require('./services/abuseDetector');
const templateResponses = require('./services/templateResponses');
```

### Endpoint Principal del Chatbot

```javascript
// POST /api/chatbot
app.post('/api/chatbot', async (req, res) => {
    try {
        const { message, conversationId, sessionId } = req.body;
        const sessionData = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: sessionId
        };

        // Crear conversación si no existe
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            currentConversationId = await claudeService.createConversation(sessionData);
        }

        // Procesar mensaje a través del sistema de 5 capas
        const response = await claudeService.sendMessage(
            currentConversationId, 
            message, 
            sessionData
        );

        res.json({
            success: true,
            conversationId: currentConversationId,
            message: response.message,
            source: response.source,
            tokensUsed: response.tokensUsed,
            canHandoff: response.canHandoff || false,
            processingTime: response.processingTime,
            leadCaptured: !!(response.entities && Object.keys(response.entities).length > 0)
        });

    } catch (error) {
        console.error('❌ Error en chatbot endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Lo siento, tuve un problema técnico. ¿Podrías intentar de nuevo?',
            error: error.message
        });
    }
});
```

### Endpoint de Estadísticas (Opcional)

```javascript
// GET /api/chatbot/stats
app.get('/api/chatbot/stats', async (req, res) => {
    try {
        const stats = {
            abuseDetector: abuseDetector.getStats(),
            templateResponses: templateResponses.getStats(),
            claudeService: claudeService.getStats()
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## 🎯 Uso del Sistema

### Ejemplo de Flujo Completo

```javascript
// Ejemplo de uso directo del servicio
const conversationId = await claudeService.createConversation({
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    sessionId: 'session-123'
});

// Enviar mensaje del usuario
const response = await claudeService.sendMessage(
    conversationId,
    'Hola, quiero información del Dolphin Mini',
    { ip: '192.168.1.100' }
);

console.log('Respuesta:', response.message);
console.log('Fuente:', response.source); // 'template', 'claude_ai', 'abuse_detector', etc.
console.log('Tokens usados:', response.tokensUsed);
```

## 📊 Características del Sistema

### 🚫 Detector de Abuso (Capa 1)
- Rate limiting: 5 mensajes/minuto por IP
- Bloqueo automático: 30 min después de 3 violaciones
- Patrones de spam detectados automáticamente
- Mensajes mínimos de 3 caracteres

### 💡 Respuestas Template (Capa 2)
- **11 categorías predefinidas**: saludos, horarios, ubicación, modelos, precios, autonomía, prueba de manejo, comparación, despedida, contacto, carga
- **0 tokens consumidos** de Claude AI
- **33 patrones** de reconocimiento
- Respuestas instantáneas para consultas comunes

### 👤 Verificación de Leads (Capa 3)
- **Extracción automática** de email, teléfono, nombre
- **Guardado inteligente** en PostgreSQL tabla `leads`
- **Actualización sin sobrescribir** datos existentes
- **Source tracking**: 'chatbot' vs 'calculator'

### 🤝 Handoff a Humanos (Capa 4)
- Oferta automática cuando se tienen datos completos
- Activación en consultas de precios/financiamiento
- Transferencia suave sin perder contexto

### 🧠 Claude AI (Capa 5)
- **Prompts adaptativos** según estado del lead
- **Máximo 2 mensajes** sin capturar datos
- **NUNCA menciona precios** sin datos del cliente
- **Redirección a calculadora** para ahorros

## 📈 Métricas y Analytics

### Tablas de Analytics Creadas:
- `conversations` - Historial de conversaciones
- `chat_messages` - Todos los mensajes
- `conversation_intents` - Análisis de intenciones
- `chatbot_analytics` - Métricas diarias
- `abuse_logs` - Registro de actividad sospechosa

### Vistas Útiles:
- `conversation_summary` - Resumen con leads
- `daily_chatbot_metrics` - Métricas por día
- `intent_analysis` - Intenciones más comunes

## 🔒 Reglas Críticas de Seguridad

### ✅ NUNCA hacer:
1. Mencionar precios específicos sin datos del lead
2. Confirmar opciones de "0% enganche"
3. Dar más de 2 mensajes sin capturar datos
4. Calcular mensualidades o ahorros (redirigir a calculadora)
5. Sobrescribir datos existentes de leads

### ✅ SIEMPRE hacer:
1. Capturar datos de contacto rápidamente
2. Redirigir cálculos a: salmabydriver.com/calculatusahorros
3. Usar source='chatbot' para leads del chat
4. Bloquear IPs abusivas automáticamente
5. Guardar TODO en PostgreSQL (no WhatsApp)

## 🛠️ Troubleshooting

### Problema: "ANTHROPIC_API_KEY es requerida"
**Solución**: Configurar la variable de entorno en `.env`

### Problema: "Base de datos no disponible"
**Solución**: Verificar que Docker Compose esté ejecutándose y ejecutar el script SQL

### Problema: Respuestas de "modo de prueba"
**Solución**: El sistema funciona sin API key para pruebas, configurar ANTHROPIC_API_KEY para producción

### Problema: Leads no se guardan
**Solución**: Verificar que la tabla `leads` exista y tenga la estructura correcta

## 📞 Soporte

Para problemas técnicos o mejoras:
1. Revisar logs en consola
2. Ejecutar `node test_chatbot.js` para diagnóstico
3. Verificar configuración de base de datos
4. Comprobar variables de entorno

## 🎉 ¡Listo para Producción!

El sistema está completamente implementado y listo para manejar conversaciones reales con usuarios interesados en vehículos BYD.

**Características principales:**
- ⚡ Respuestas instantáneas
- 💰 Optimización de costos
- 🛡️ Protección contra spam
- 📊 Analytics detallados
- 🔄 Captura inteligente de leads
- 🤖 IA avanzada cuando es necesaria