/**
 * Upload middleware: multer + sharp
 * - Guarda archivo temporal en uploads/_tmp/
 * - Procesa con sharp (resize + thumbnail)
 * - Almacena en uploads/{folder}/{slug}-{timestamp}.webp
 */
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const TMP_DIR = path.join(UPLOAD_ROOT, '_tmp');

// Crear directorios si no existen
[UPLOAD_ROOT, TMP_DIR, path.join(UPLOAD_ROOT, 'entregas'), path.join(UPLOAD_ROOT, 'promociones')]
    .forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
    destination: TMP_DIR,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.mimetype)) {
        return cb(new Error('Solo imágenes JPG, PNG, WEBP o HEIC.'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 12 * 1024 * 1024 } // 12 MB
});

/**
 * Procesa imagen con sharp:
 * - principal: max 1600px ancho, webp 85%
 * - thumbnail: 400x400 cover, webp 80%
 * Retorna { principal, thumbnail } con rutas relativas a /uploads/
 */
async function processImage(tmpPath, folder, slug) {
    const safeSlug = (slug || 'img').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 60) || 'img';
    const ts = Date.now();
    const baseName = `${safeSlug}-${ts}`;

    const folderPath = path.join(UPLOAD_ROOT, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    const principalRel = `/uploads/${folder}/${baseName}.webp`;
    const thumbRel = `/uploads/${folder}/${baseName}-thumb.webp`;

    await sharp(tmpPath)
        .rotate() // auto-orient
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(path.join(folderPath, `${baseName}.webp`));

    await sharp(tmpPath)
        .rotate()
        .resize({ width: 400, height: 400, fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(folderPath, `${baseName}-thumb.webp`));

    // Limpiar tmp
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    return { principal: principalRel, thumbnail: thumbRel };
}

module.exports = { upload, processImage };
