-- =====================================================
-- TABLAS PARA SISTEMA DE CHATBOT INTELIGENTE BYD
-- =====================================================
-- 
-- Este archivo contiene las tablas necesarias para el
-- sistema de chatbot híbrido de 5 capas
-- 
-- DEPENDENCIAS:
-- - Extensión UUID para PostgreSQL
-- - Tabla 'leads' ya debe existir
-- 
-- EJECUCIÓN:
-- psql -h localhost -U postgres -d byd_calculator_db -f chatbot_tables.sql
-- 
-- @author Sistema BYD Chatbot  
-- @version 1.0.0
-- =====================================================

-- Activar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: conversations
-- =====================================================
-- Almacena información de cada conversación de chatbot
--
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),  -- IPv6 compatible
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_messages INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'blocked')),
    
    -- Índices para optimización
    CONSTRAINT conversations_session_id_idx UNIQUE (session_id)
);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_ip_address ON conversations(ip_address);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- =====================================================
-- TABLA: chat_messages  
-- =====================================================
-- Almacena todos los mensajes del chatbot
--
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    
    -- Datos de intención y entidades
    intent_detected VARCHAR(50),
    confidence_score DECIMAL(3,2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    entities_extracted JSONB DEFAULT '{}',
    
    -- Metadatos del sistema
    source VARCHAR(50) DEFAULT 'unknown',  -- 'user_input', 'claude_ai', 'template', 'abuse_detector', etc.
    processing_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON chat_messages(intent_detected);
CREATE INDEX IF NOT EXISTS idx_chat_messages_source ON chat_messages(source);

-- Índice GIN para búsqueda en entities_extracted
CREATE INDEX IF NOT EXISTS idx_chat_messages_entities_gin ON chat_messages USING GIN (entities_extracted);

-- =====================================================
-- TABLA: conversation_intents
-- =====================================================  
-- Almacena análisis de intenciones por conversación
--
CREATE TABLE IF NOT EXISTS conversation_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    intent_type VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    entities JSONB DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadatos adicionales
    message_count_when_detected INTEGER DEFAULT 0,
    triggered_action VARCHAR(100),  -- 'template_response', 'claude_ai', 'handoff_offer', etc.
    
    UNIQUE(conversation_id, intent_type, detected_at)
);

-- Índices para conversation_intents
CREATE INDEX IF NOT EXISTS idx_conversation_intents_conversation_id ON conversation_intents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_intents_intent_type ON conversation_intents(intent_type);
CREATE INDEX IF NOT EXISTS idx_conversation_intents_detected_at ON conversation_intents(detected_at);
CREATE INDEX IF NOT EXISTS idx_conversation_intents_entities_gin ON conversation_intents USING GIN (entities);

-- =====================================================
-- TABLA: chatbot_analytics
-- =====================================================
-- Métricas y analytics del sistema de chatbot
--
CREATE TABLE IF NOT EXISTS chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Métricas de uso
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    
    -- Métricas de fuentes de respuesta
    template_responses INTEGER DEFAULT 0,
    claude_ai_responses INTEGER DEFAULT 0,
    abuse_blocked_messages INTEGER DEFAULT 0,
    handoff_offers INTEGER DEFAULT 0,
    
    -- Métricas de leads
    leads_captured INTEGER DEFAULT 0,
    leads_with_complete_data INTEGER DEFAULT 0,
    
    -- Métricas de intenciones
    intent_cotizacion INTEGER DEFAULT 0,
    intent_prueba_manejo INTEGER DEFAULT 0,
    intent_informacion INTEGER DEFAULT 0,
    intent_comparacion INTEGER DEFAULT 0,
    intent_financiamiento INTEGER DEFAULT 0,
    
    -- Costos
    total_cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    avg_cost_per_conversation DECIMAL(10,4) DEFAULT 0.0000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Índice para chatbot_analytics
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON chatbot_analytics(date);

-- =====================================================
-- TABLA: abuse_logs
-- =====================================================
-- Registro de actividades de abuso y spam
--
CREATE TABLE IF NOT EXISTS abuse_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    abuse_type VARCHAR(50) NOT NULL, -- 'spam_pattern', 'rate_limit', 'repeated_message', 'ip_blocked'
    abuse_reason TEXT,
    message_content TEXT,
    
    action_taken VARCHAR(50) NOT NULL, -- 'warn', 'block', 'ignore'
    block_duration_minutes INTEGER DEFAULT 0,
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para abuse_logs
CREATE INDEX IF NOT EXISTS idx_abuse_logs_ip_address ON abuse_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_abuse_logs_abuse_type ON abuse_logs(abuse_type);
CREATE INDEX IF NOT EXISTS idx_abuse_logs_detected_at ON abuse_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_abuse_logs_conversation_id ON abuse_logs(conversation_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Conversaciones con información de leads
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    c.id as conversation_id,
    c.session_id,
    c.created_at as conversation_started,
    c.total_messages,
    c.total_tokens_used,
    c.status,
    l.id as lead_id,
    l.name as lead_name,
    l.email as lead_email,
    l.phone as lead_phone,
    l.source as lead_source,
    -- Estadísticas de mensajes
    (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND role = 'user') as user_messages,
    (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND role = 'assistant') as assistant_messages,
    -- Última actividad
    (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id) as last_activity
FROM conversations c
LEFT JOIN leads l ON c.lead_id = l.id;

-- Vista: Métricas diarias del chatbot
CREATE OR REPLACE VIEW daily_chatbot_metrics AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT id) as conversations,
    SUM(total_messages) as total_messages,
    SUM(total_tokens_used) as total_tokens,
    COUNT(DISTINCT lead_id) FILTER (WHERE lead_id IS NOT NULL) as leads_captured,
    AVG(total_messages) as avg_messages_per_conversation,
    AVG(total_tokens_used) as avg_tokens_per_conversation
FROM conversations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Vista: Análisis de intenciones más comunes
CREATE OR REPLACE VIEW intent_analysis AS
SELECT 
    intent_detected,
    COUNT(*) as frequency,
    AVG(confidence_score) as avg_confidence,
    COUNT(DISTINCT conversation_id) as unique_conversations
FROM chat_messages 
WHERE intent_detected IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY intent_detected
ORDER BY frequency DESC;

-- =====================================================
-- DATOS INICIALES Y CONFIGURACIÓN
-- =====================================================

-- Insertar configuración inicial si no existe
INSERT INTO chatbot_analytics (date, total_conversations, total_messages, total_tokens_used)
VALUES (CURRENT_DATE, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

-- Aplicar permisos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verificar que todo se haya creado correctamente
DO $$
BEGIN
    RAISE NOTICE 'Verificando tablas creadas...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE '✅ Tabla conversations creada correctamente';
    ELSE
        RAISE WARNING '❌ Error: Tabla conversations no encontrada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        RAISE NOTICE '✅ Tabla chat_messages creada correctamente';
    ELSE
        RAISE WARNING '❌ Error: Tabla chat_messages no encontrada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_intents') THEN
        RAISE NOTICE '✅ Tabla conversation_intents creada correctamente';
    ELSE
        RAISE WARNING '❌ Error: Tabla conversation_intents no encontrada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chatbot_analytics') THEN
        RAISE NOTICE '✅ Tabla chatbot_analytics creada correctamente';
    ELSE
        RAISE WARNING '❌ Error: Tabla chatbot_analytics no encontrada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'abuse_logs') THEN
        RAISE NOTICE '✅ Tabla abuse_logs creada correctamente';
    ELSE
        RAISE WARNING '❌ Error: Tabla abuse_logs no encontrada';
    END IF;
    
    RAISE NOTICE '🎉 ¡Instalación de tablas del chatbot completada!';
    RAISE NOTICE '📊 Ahora puedes usar el sistema de chatbot BYD';
    RAISE NOTICE '🔧 Recuerda configurar ANTHROPIC_API_KEY en tu archivo .env';
END $$;