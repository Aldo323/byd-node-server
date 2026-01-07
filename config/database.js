/**
 * Configuración de Base de Datos PostgreSQL
 */

const { Pool } = require('pg');

// Configuración desde variables de entorno o valores por defecto
const pool = new Pool({
    host: process.env.DB_HOST || '172.18.0.9',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_DATABASE || 'byd_calculator_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Ant_2019.',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Verificar conexión al iniciar
pool.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL establecida');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    });

// Función helper para queries
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 100) {
            console.log(`⏱️ Query lenta (${duration}ms):`, text.substring(0, 50));
        }
        return res;
    } catch (error) {
        console.error('❌ Error en query:', error.message);
        throw error;
    }
}

module.exports = {
    query,
    pool
};
