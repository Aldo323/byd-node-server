/**
 * Middleware: requireAuth
 * Protege rutas /admin/* — redirige a /admin/login si no hay sesión válida.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.admin && req.session.admin.id) {
        res.locals.admin = req.session.admin;
        return next();
    }
    // Para APIs devolver 401, para vistas redirigir
    if (req.path.startsWith('/api/') || req.xhr || req.get('accept')?.includes('application/json')) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    return res.redirect('/admin/login');
}

module.exports = requireAuth;
