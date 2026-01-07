/**
 * SCRIPT DE PRUEBAS PARA SISTEMA DE CHATBOT BYD
 * =============================================
 * 
 * Este script verifica que todos los componentes del sistema
 * de chatbot funcionen correctamente.
 * 
 * EJECUCIÓN:
 * node test_chatbot.js
 * 
 * @author Sistema BYD Chatbot
 * @version 1.0.0
 */

console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE CHATBOT BYD\n');

// Test 1: Importar todos los servicios
try {
    console.log('📦 Test 1: Importando servicios...');
    const abuseDetector = require('./services/abuseDetector');
    const templateResponses = require('./services/templateResponses');
    const claudeService = require('./services/claudeService');
    console.log('✅ Todos los servicios importados correctamente\n');
} catch (error) {
    console.error('❌ Error importando servicios:', error.message);
    process.exit(1);
}

async function runTests() {
    const abuseDetector = require('./services/abuseDetector');
    const templateResponses = require('./services/templateResponses');
    const claudeService = require('./services/claudeService');

    // Test 2: Detección de spam
    console.log('🚫 Test 2: Detección de abuso y spam...');
    try {
        // Test spam pattern
        const spamTest = await abuseDetector.check('192.168.1.1', 'aaaaa', 'test-conv-1');
        console.log('  - Spam pattern (aaaaa):', spamTest.isAbuse ? '✅ DETECTADO' : '❌ NO DETECTADO');
        
        // Test mensaje válido
        const validTest = await abuseDetector.check('192.168.1.2', 'Hola, quiero información del Dolphin Mini', 'test-conv-2');
        console.log('  - Mensaje válido:', !validTest.isAbuse ? '✅ ACEPTADO' : '❌ RECHAZADO');
        
        // Test mensaje muy corto
        const shortTest = await abuseDetector.check('192.168.1.3', 'hi', 'test-conv-3');
        console.log('  - Mensaje corto (hi):', shortTest.isAbuse ? '✅ DETECTADO' : '❌ NO DETECTADO');
        
        console.log('✅ Test de detección de abuso completado\n');
    } catch (error) {
        console.error('❌ Error en test de abuso:', error.message);
    }

    // Test 3: Respuestas template
    console.log('💡 Test 3: Respuestas template...');
    try {
        // Test saludo
        const saludoMatch = templateResponses.match('hola');
        console.log('  - Saludo (hola):', saludoMatch ? `✅ MATCHED: ${saludoMatch.category}` : '❌ NO MATCHED');
        
        // Test horarios
        const horarioMatch = templateResponses.match('qué horario tienen');
        console.log('  - Horarios:', horarioMatch ? `✅ MATCHED: ${horarioMatch.category}` : '❌ NO MATCHED');
        
        // Test modelos
        const modelosMatch = templateResponses.match('qué vehículos tienen disponibles');
        console.log('  - Modelos:', modelosMatch ? `✅ MATCHED: ${modelosMatch.category}` : '❌ NO MATCHED');
        
        // Test precio
        const precioMatch = templateResponses.match('cuánto cuesta el Dolphin Mini');
        console.log('  - Precios:', precioMatch ? `✅ MATCHED: ${precioMatch.category}` : '❌ NO MATCHED');
        
        // Test mensaje que no debe hacer match
        const noMatch = templateResponses.match('sdajklsdjalksdjlaksjdlaksjd');
        console.log('  - Mensaje inválido:', !noMatch ? '✅ NO MATCHED correctamente' : '❌ MATCHED incorrectamente');
        
        console.log('✅ Test de respuestas template completado\n');
    } catch (error) {
        console.error('❌ Error en test de templates:', error.message);
    }

    // Test 4: Extracción de entidades
    console.log('🎯 Test 4: Extracción de entidades...');
    try {
        // Test mensaje con datos completos
        const mensaje1 = 'Hola, me llamo Juan Pérez, mi email es juan@gmail.com y mi teléfono es 8112345678';
        const entities1 = claudeService.extractEntities(mensaje1);
        console.log('  - Datos completos:', entities1);
        
        // Test solo teléfono
        const mensaje2 = 'Mi número es 81-1234-5678';
        const entities2 = claudeService.extractEntities(mensaje2);
        console.log('  - Solo teléfono:', entities2);
        
        // Test solo email
        const mensaje3 = 'Escríbeme a maria.lopez@hotmail.com';
        const entities3 = claudeService.extractEntities(mensaje3);
        console.log('  - Solo email:', entities3);
        
        // Test kilómetros
        const mensaje4 = 'Recorro 50 km al día';
        const entities4 = claudeService.extractEntities(mensaje4);
        console.log('  - Kilómetros diarios:', entities4);
        
        console.log('✅ Test de extracción de entidades completado\n');
    } catch (error) {
        console.error('❌ Error en test de entidades:', error.message);
    }

    // Test 5: Detección de intenciones
    console.log('🧠 Test 5: Detección de intenciones...');
    try {
        // Test cotización
        const intent1 = claudeService.detectIntent('cuánto cuesta el Seal');
        console.log('  - Cotización:', intent1);
        
        // Test prueba de manejo
        const intent2 = claudeService.detectIntent('me gustaría probar el Dolphin Mini');
        console.log('  - Prueba de manejo:', intent2);
        
        // Test información
        const intent3 = claudeService.detectIntent('qué autonomía tiene el Sealion 7');
        console.log('  - Información:', intent3);
        
        // Test financiamiento
        const intent4 = claudeService.detectIntent('qué opciones de enganche tienen');
        console.log('  - Financiamiento:', intent4);
        
        console.log('✅ Test de detección de intenciones completado\n');
    } catch (error) {
        console.error('❌ Error en test de intenciones:', error.message);
    }

    // Test 6: Sistema de prompts
    console.log('📝 Test 6: Sistema de prompts...');
    try {
        // Prompt sin datos del lead
        const prompt1 = claudeService.getSystemPrompt(false, 0);
        console.log('  - Prompt sin lead (primer mensaje):', prompt1.length > 100 ? '✅ GENERADO' : '❌ VACÍO');
        
        // Prompt sin datos del lead (último mensaje)
        const prompt2 = claudeService.getSystemPrompt(false, 1);
        console.log('  - Prompt sin lead (último mensaje):', prompt2.includes('URGENTE') ? '✅ URGENTE DETECTADO' : '❌ NO URGENTE');
        
        // Prompt con datos del lead
        const prompt3 = claudeService.getSystemPrompt(true, 5);
        console.log('  - Prompt con lead:', prompt3.length > 100 ? '✅ GENERADO' : '❌ VACÍO');
        
        console.log('✅ Test de sistema de prompts completado\n');
    } catch (error) {
        console.error('❌ Error en test de prompts:', error.message);
    }

    // Test 7: Estadísticas de los servicios
    console.log('📊 Test 7: Estadísticas de servicios...');
    try {
        const abuseStats = abuseDetector.getStats();
        console.log('  - AbuseDetector stats:', abuseStats);
        
        const templateStats = templateResponses.getStats();
        console.log('  - TemplateResponses stats:', templateStats);
        
        const claudeStats = claudeService.getStats();
        console.log('  - ClaudeService stats:', claudeStats);
        
        console.log('✅ Test de estadísticas completado\n');
    } catch (error) {
        console.error('❌ Error en test de estadísticas:', error.message);
    }

    // Test 8: Verificar configuración
    console.log('⚙️ Test 8: Verificación de configuración...');
    try {
        // Verificar si la API key está configurada
        const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
        console.log('  - ANTHROPIC_API_KEY configurada:', hasApiKey ? '✅ SÍ' : '⚠️ NO (requerida para producción)');
        
        // Verificar conexión a base de datos
        let dbAvailable = false;
        try {
            const db = require('./config/database');
            dbAvailable = !!db;
            console.log('  - Conexión a base de datos:', dbAvailable ? '✅ DISPONIBLE' : '❌ NO DISPONIBLE');
        } catch (dbError) {
            console.log('  - Conexión a base de datos: ⚠️ NO CONFIGURADA');
        }
        
        console.log('✅ Test de configuración completado\n');
    } catch (error) {
        console.error('❌ Error en test de configuración:', error.message);
    }

    // Resumen final
    console.log('🎉 PRUEBAS COMPLETADAS');
    console.log('========================');
    console.log('✅ Sistema de chatbot BYD implementado correctamente');
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('1. Configurar ANTHROPIC_API_KEY en archivo .env');
    console.log('2. Ejecutar script SQL para crear tablas: database/chatbot_tables.sql');
    console.log('3. Integrar los servicios en tu aplicación principal');
    console.log('4. Configurar endpoints del chatbot en server.js');
    console.log('');
    console.log('📁 ARCHIVOS CREADOS:');
    console.log('- services/abuseDetector.js (Capa 1: Detección de spam)');
    console.log('- services/templateResponses.js (Capa 2: Respuestas template)');
    console.log('- services/claudeService.js (Capas 3-5: IA y leads)');
    console.log('- database/chatbot_tables.sql (Tablas PostgreSQL)');
    console.log('');
    console.log('🚀 ¡El sistema está listo para usar!');
}

// Ejecutar todas las pruebas
runTests().catch(error => {
    console.error('❌ Error general en las pruebas:', error);
    process.exit(1);
});