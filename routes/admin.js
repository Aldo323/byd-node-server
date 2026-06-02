/**
 * Admin routes - login OTP + CRUD entregas/comentarios/promociones/contenido
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const otpService = require('../services/otpService');
const requireAuth = require('../middleware/requireAuth');
const { upload, processImage } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const SALMA_PHONE = '+528120272752';

// ============ LOGIN (público) ============
router.get('/login', (req, res) => {
    if (req.session?.admin?.id) return res.redirect('/admin');
    res.render('admin/login', {
        step: 'request',
        phoneHint: SALMA_PHONE.slice(0, 4) + '****' + SALMA_PHONE.slice(-2),
        message: null,
        error: null
    });
});

router.post('/login/request', async (req, res) => {
    const phone = (req.body.phone || SALMA_PHONE).trim();
    const ip = req.ip;
    const result = await otpService.requestOTP(phone, ip);

    if (!result.ok) {
        return res.render('admin/login', {
            step: 'request',
            phoneHint: SALMA_PHONE.slice(0, 4) + '****' + SALMA_PHONE.slice(-2),
            message: null,
            error: result.error
        });
    }
    req.session.pendingPhone = phone;
    res.render('admin/login', {
        step: 'verify',
        phoneHint: result.masked,
        message: 'Te enviamos un código por SMS. Ingrésalo aquí.',
        error: null
    });
});

router.post('/login/verify', async (req, res) => {
    const phone = req.session.pendingPhone || SALMA_PHONE;
    const code = (req.body.code || '').trim();
    const result = await otpService.verifyOTP(phone, code);

    if (!result.ok) {
        return res.render('admin/login', {
            step: 'verify',
            phoneHint: phone.slice(0, 4) + '****' + phone.slice(-2),
            message: null,
            error: result.error
        });
    }
    req.session.admin = result.admin;
    delete req.session.pendingPhone;
    res.redirect('/admin');
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

// ============ DASHBOARD ============
router.get('/', requireAuth, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM entregas WHERE publicada = TRUE) AS entregas_publicadas,
                (SELECT COUNT(*) FROM entregas WHERE created_at > NOW() - INTERVAL '30 days') AS entregas_mes,
                (SELECT COUNT(*) FROM comentarios WHERE aprobado = FALSE) AS comentarios_pendientes,
                (SELECT COUNT(*) FROM comentarios WHERE aprobado = TRUE) AS comentarios_aprobados,
                (SELECT COUNT(*) FROM promociones WHERE activa = TRUE) AS promociones_activas
        `);
        res.render('admin/dashboard', { stats: stats.rows[0] });
    } catch (err) {
        console.error('[admin/dashboard] error:', err);
        res.render('admin/dashboard', { stats: {} });
    }
});

// ============ ENTREGAS ============
router.get('/entregas', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM entregas ORDER BY fecha_entrega DESC, id DESC');
    res.render('admin/entregas', { entregas: result.rows, edit: null, error: null });
});

router.get('/entregas/nueva', requireAuth, (req, res) => {
    res.render('admin/entregas-form', { entrega: null, error: null });
});

router.get('/entregas/:id/editar', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM entregas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.redirect('/admin/entregas');
    res.render('admin/entregas-form', { entrega: result.rows[0], error: null });
});

router.post('/entregas/guardar', requireAuth, upload.single('foto'), async (req, res) => {
    const {
        id, cliente_nombre, cliente_ciudad, modelo, color,
        fecha_entrega, descripcion, destacada, publicada
    } = req.body;

    try {
        let foto_principal = req.body.foto_principal_existente || null;
        let foto_thumbnail = req.body.foto_thumbnail_existente || null;

        if (req.file) {
            const slug = `${cliente_nombre}-${modelo}`.toLowerCase();
            const imgs = await processImage(req.file.path, 'entregas', slug);
            foto_principal = imgs.principal;
            foto_thumbnail = imgs.thumbnail;
        }

        if (!foto_principal) {
            return res.render('admin/entregas-form', {
                entrega: req.body,
                error: 'Debes subir una foto.'
            });
        }

        if (id) {
            await db.query(`
                UPDATE entregas SET
                    cliente_nombre=$1, cliente_ciudad=$2, modelo=$3, color=$4,
                    fecha_entrega=$5, descripcion=$6, foto_principal=$7, foto_thumbnail=$8,
                    destacada=$9, publicada=$10, updated_at=NOW()
                WHERE id=$11
            `, [cliente_nombre, cliente_ciudad, modelo, color, fecha_entrega || null, descripcion,
                foto_principal, foto_thumbnail, !!destacada, !!publicada, id]);
        } else {
            await db.query(`
                INSERT INTO entregas (cliente_nombre, cliente_ciudad, modelo, color, fecha_entrega,
                    descripcion, foto_principal, foto_thumbnail, destacada, publicada)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `, [cliente_nombre, cliente_ciudad, modelo, color, fecha_entrega || null, descripcion,
                foto_principal, foto_thumbnail, !!destacada, !!publicada]);
        }

        res.redirect('/admin/entregas');
    } catch (err) {
        console.error('[admin/entregas guardar] error:', err);
        res.render('admin/entregas-form', { entrega: req.body, error: err.message });
    }
});

router.post('/entregas/:id/eliminar', requireAuth, async (req, res) => {
    try {
        const r = await db.query('SELECT foto_principal, foto_thumbnail FROM entregas WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM entregas WHERE id = $1', [req.params.id]);
        // Borrar archivos físicos
        if (r.rows[0]) {
            ['foto_principal', 'foto_thumbnail'].forEach(k => {
                const rel = r.rows[0][k];
                if (rel && rel.startsWith('/uploads/')) {
                    const abs = path.join(__dirname, '..', rel);
                    try { fs.unlinkSync(abs); } catch (_) {}
                }
            });
        }
    } catch (err) {
        console.error('[admin/entregas eliminar] error:', err);
    }
    res.redirect('/admin/entregas');
});

// ============ COMENTARIOS ============
router.get('/comentarios', requireAuth, async (req, res) => {
    const filter = req.query.filter || 'pendientes';
    let where = '';
    if (filter === 'pendientes') where = 'WHERE aprobado = FALSE';
    if (filter === 'aprobados') where = 'WHERE aprobado = TRUE';
    const result = await db.query(`SELECT * FROM comentarios ${where} ORDER BY created_at DESC`);
    res.render('admin/comentarios', { comentarios: result.rows, filter });
});

router.post('/comentarios/:id/aprobar', requireAuth, async (req, res) => {
    await db.query('UPDATE comentarios SET aprobado = TRUE, aprobado_at = NOW() WHERE id = $1', [req.params.id]);
    res.redirect('/admin/comentarios');
});

router.post('/comentarios/:id/rechazar', requireAuth, async (req, res) => {
    await db.query('UPDATE comentarios SET aprobado = FALSE WHERE id = $1', [req.params.id]);
    res.redirect('/admin/comentarios');
});

router.post('/comentarios/:id/destacar', requireAuth, async (req, res) => {
    await db.query('UPDATE comentarios SET destacado = NOT destacado WHERE id = $1', [req.params.id]);
    res.redirect('/admin/comentarios?filter=aprobados');
});

router.post('/comentarios/:id/eliminar', requireAuth, async (req, res) => {
    await db.query('DELETE FROM comentarios WHERE id = $1', [req.params.id]);
    res.redirect('/admin/comentarios');
});

// ============ PROMOCIONES ============
router.get('/promociones', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM promociones ORDER BY activa DESC, orden ASC, id DESC');
    res.render('admin/promociones', { promociones: result.rows });
});

router.get('/promociones/nueva', requireAuth, (req, res) => {
    res.render('admin/promociones-form', { promo: null, error: null });
});

router.get('/promociones/:id/editar', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM promociones WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.redirect('/admin/promociones');
    res.render('admin/promociones-form', { promo: result.rows[0], error: null });
});

router.post('/promociones/guardar', requireAuth, upload.single('imagen'), async (req, res) => {
    const { id, titulo, subtitulo, descripcion, cta_texto, cta_url, color_acento,
            vigente_desde, vigente_hasta, activa, orden } = req.body;
    try {
        let imagen = req.body.imagen_existente || null;
        if (req.file) {
            const slug = titulo;
            const imgs = await processImage(req.file.path, 'promociones', slug);
            imagen = imgs.principal;
        }
        if (id) {
            await db.query(`
                UPDATE promociones SET titulo=$1, subtitulo=$2, descripcion=$3, imagen=$4,
                    cta_texto=$5, cta_url=$6, color_acento=$7, vigente_desde=$8, vigente_hasta=$9,
                    activa=$10, orden=$11, updated_at=NOW()
                WHERE id=$12
            `, [titulo, subtitulo, descripcion, imagen, cta_texto || 'Más información', cta_url,
                color_acento || '#059669', vigente_desde || null, vigente_hasta || null,
                !!activa, parseInt(orden) || 0, id]);
        } else {
            await db.query(`
                INSERT INTO promociones (titulo, subtitulo, descripcion, imagen, cta_texto,
                    cta_url, color_acento, vigente_desde, vigente_hasta, activa, orden)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            `, [titulo, subtitulo, descripcion, imagen, cta_texto || 'Más información', cta_url,
                color_acento || '#059669', vigente_desde || null, vigente_hasta || null,
                !!activa, parseInt(orden) || 0]);
        }
        res.redirect('/admin/promociones');
    } catch (err) {
        console.error('[admin/promociones guardar]', err);
        res.render('admin/promociones-form', { promo: req.body, error: err.message });
    }
});

router.post('/promociones/:id/eliminar', requireAuth, async (req, res) => {
    await db.query('DELETE FROM promociones WHERE id = $1', [req.params.id]);
    res.redirect('/admin/promociones');
});

// ============ CONTENIDO (rincón BYD) ============
router.get('/contenido', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM page_content ORDER BY slug');
    res.render('admin/contenido', { paginas: result.rows });
});

router.get('/contenido/:slug', requireAuth, async (req, res) => {
    const result = await db.query('SELECT * FROM page_content WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) return res.redirect('/admin/contenido');
    res.render('admin/contenido-form', { pagina: result.rows[0] });
});

router.post('/contenido/:slug', requireAuth, async (req, res) => {
    const { titulo, contenido_html } = req.body;
    await db.query(`
        UPDATE page_content SET titulo=$1, contenido_html=$2, updated_by=$3, updated_at=NOW()
        WHERE slug=$4
    `, [titulo, contenido_html, req.session.admin.id, req.params.slug]);
    res.redirect('/admin/contenido');
});

module.exports = router;
