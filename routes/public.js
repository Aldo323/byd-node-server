/**
 * Rutas públicas para entregas, comentarios, rincón BYD
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============ ENTREGAS (galería) ============
router.get('/entregas', async (req, res) => {
    const result = await db.query(
        'SELECT * FROM entregas WHERE publicada = TRUE ORDER BY destacada DESC, fecha_entrega DESC, id DESC LIMIT 60'
    );
    res.render('public/entregas', { entregas: result.rows });
});

// ============ ¿QUÉ ES BYD? ============
router.get('/que-es-byd', async (req, res) => {
    const result = await db.query('SELECT * FROM page_content WHERE slug = $1', ['que-es-byd']);
    const pagina = result.rows[0] || { titulo: '¿Qué es BYD?', contenido_html: '' };
    // Trae también comentarios destacados/aprobados para confianza
    const coms = await db.query(
        'SELECT * FROM comentarios WHERE aprobado = TRUE ORDER BY destacado DESC, created_at DESC LIMIT 6'
    );
    res.render('public/que-es-byd', { pagina, comentarios: coms.rows });
});

// ============ COMENTARIOS ============
router.get('/comentarios', async (req, res) => {
    const result = await db.query(
        'SELECT * FROM comentarios WHERE aprobado = TRUE ORDER BY destacado DESC, created_at DESC'
    );
    res.render('public/comentarios', { comentarios: result.rows, success: req.query.ok === '1', error: null });
});

router.post('/comentarios', async (req, res) => {
    const { nombre, ciudad, modelo_byd, texto, estrellas } = req.body;

    // Validaciones simples
    if (!nombre || !texto || nombre.length < 2 || texto.length < 10) {
        return res.render('public/comentarios', {
            comentarios: [],
            success: false,
            error: 'Llena tu nombre y un comentario de al menos 10 caracteres.'
        });
    }
    if (texto.length > 1500 || nombre.length > 120) {
        return res.render('public/comentarios', {
            comentarios: [], success: false, error: 'Comentario o nombre demasiado largo.'
        });
    }

    // Anti-spam mínimo: 1 comentario por IP cada 5 min
    const ip = req.ip;
    const recent = await db.query(
        `SELECT id FROM comentarios WHERE ip_origen = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
        [ip]
    );
    if (recent.rows.length > 0) {
        return res.render('public/comentarios', {
            comentarios: [], success: false,
            error: 'Por favor espera unos minutos antes de enviar otro comentario.'
        });
    }

    try {
        await db.query(`
            INSERT INTO comentarios (nombre, ciudad, modelo_byd, texto, estrellas, ip_origen, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            nombre.trim().substring(0, 120),
            ciudad ? ciudad.trim().substring(0, 100) : null,
            modelo_byd ? modelo_byd.trim().substring(0, 80) : null,
            texto.trim().substring(0, 1500),
            parseInt(estrellas) || 5,
            ip,
            (req.get('user-agent') || '').substring(0, 500)
        ]);
        res.redirect('/comentarios?ok=1');
    } catch (err) {
        console.error('[public/comentarios] error:', err);
        res.render('public/comentarios', {
            comentarios: [], success: false, error: 'No se pudo guardar tu comentario. Inténtalo más tarde.'
        });
    }
});

module.exports = router;
