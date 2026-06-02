/**
 * OTP Service - Login por SMS para administradores
 *
 * Flow:
 *   1. Usuario pide código → generamos 6 dígitos, guardamos en DB con TTL 10 min
 *   2. Enviamos SMS al teléfono admin via sms.lizza.com.mx
 *   3. Usuario ingresa código → verificamos contra DB, marcamos used=true
 *   4. Si válido, sesión se autentica
 */

const db = require('../config/database');
const crypto = require('crypto');

const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL || 'https://sms.lizza.com.mx';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function generateCode() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Solicita un OTP para un teléfono admin.
 * Genera código, guarda en DB, envía SMS.
 * Retorna: { ok: true } | { ok: false, error }
 */
async function requestOTP(phone, ip) {
    try {
        // Verificar que el teléfono pertenece a un admin activo
        const adminRow = await db.query(
            'SELECT id, nombre, activo FROM admin_users WHERE phone = $1',
            [phone]
        );
        if (adminRow.rows.length === 0 || !adminRow.rows[0].activo) {
            // No revelamos si el teléfono existe (anti-enumeración)
            console.log(`[OTP] Intento con teléfono no autorizado: ${phone}`);
            // Esperar para igualar timing
            await new Promise(r => setTimeout(r, 600));
            return { ok: true, masked: maskPhone(phone) };
        }

        // Rate limit: max 1 OTP cada 30 segundos
        const recent = await db.query(
            `SELECT created_at FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );
        if (recent.rows.length > 0) {
            const ago = (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000;
            if (ago < 30) {
                return { ok: false, error: 'Espera unos segundos antes de pedir otro código.' };
            }
        }

        // Generar y guardar
        const code = generateCode();
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        await db.query(
            `INSERT INTO otp_codes (phone, code, expires_at, ip_origen) VALUES ($1, $2, $3, $4)`,
            [phone, code, expiresAt, ip]
        );

        // Logear código en server (ops/debug)
        console.log(`[OTP] Código generado para ${maskPhone(phone)}: ${code} (expira en ${OTP_TTL_MINUTES}min)`);

        // Enviar SMS
        await sendSMS(phone, `BYD Admin - Tu código de acceso es: ${code}\n\nVálido por ${OTP_TTL_MINUTES} minutos. No lo compartas.`);

        return { ok: true, masked: maskPhone(phone) };
    } catch (err) {
        console.error('[OTP] Error en requestOTP:', err);
        return { ok: false, error: 'No se pudo procesar la solicitud.' };
    }
}

/**
 * Verifica un código OTP.
 * Retorna: { ok: true, admin: {...} } | { ok: false, error }
 */
async function verifyOTP(phone, code) {
    try {
        // Buscar el OTP activo más reciente para ese teléfono
        const result = await db.query(
            `SELECT id, code, expires_at, used, attempts
             FROM otp_codes
             WHERE phone = $1 AND used = FALSE
             ORDER BY created_at DESC
             LIMIT 1`,
            [phone]
        );

        if (result.rows.length === 0) {
            return { ok: false, error: 'No hay código pendiente. Solicita uno nuevo.' };
        }

        const otp = result.rows[0];

        if (otp.attempts >= OTP_MAX_ATTEMPTS) {
            await db.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otp.id]);
            return { ok: false, error: 'Demasiados intentos fallidos. Solicita un código nuevo.' };
        }

        if (new Date(otp.expires_at) < new Date()) {
            return { ok: false, error: 'El código expiró. Solicita uno nuevo.' };
        }

        if (otp.code !== code.trim()) {
            await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
            return { ok: false, error: 'Código incorrecto.' };
        }

        // Válido — marcar como usado
        await db.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otp.id]);

        // Cargar datos del admin
        const adminRow = await db.query(
            'SELECT id, nombre, phone, role FROM admin_users WHERE phone = $1 AND activo = TRUE',
            [phone]
        );

        if (adminRow.rows.length === 0) {
            return { ok: false, error: 'Cuenta no autorizada.' };
        }

        await db.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [adminRow.rows[0].id]);

        return { ok: true, admin: adminRow.rows[0] };
    } catch (err) {
        console.error('[OTP] Error en verifyOTP:', err);
        return { ok: false, error: 'Error al verificar el código.' };
    }
}

/**
 * Normaliza el teléfono al formato que entrega el módem (solo 10 dígitos nacionales).
 * El módem Huawei E3372 con SIM mexicana solo entrega cuando el destino es 10 dígitos sin prefijo país.
 *   +528120272752 → 8120272752
 *   528120272752  → 8120272752
 *   8120272752    → 8120272752
 */
function normalizePhoneForSMS(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
    if (digits.length === 13 && digits.startsWith('521')) return digits.slice(3);
    return digits.slice(-10);
}

async function sendSMS(phone, message) {
    if (!SMS_API_KEY) {
        console.log('[OTP] SMS_API_KEY no configurada - SMS omitido. Revisa logs para el código.');
        return;
    }
    const phoneForSMS = normalizePhoneForSMS(phone);
    try {
        const response = await fetch(`${SMS_GATEWAY_URL}/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': SMS_API_KEY },
            body: JSON.stringify({ phone: phoneForSMS, message })
        });
        const result = await response.json();
        if (!result.success) {
            console.error('[OTP] SMS gateway respondió error:', result);
        } else {
            console.log(`[OTP] SMS enviado al módem para ${phoneForSMS}`);
        }
    } catch (err) {
        console.error('[OTP] Error enviando SMS:', err.message);
    }
}

function maskPhone(phone) {
    if (!phone || phone.length < 6) return '****';
    return phone.slice(0, -6).replace(/\d/g, '*') + '*****' + phone.slice(-2);
}

// Limpieza periódica de OTPs vencidos (cada hora)
setInterval(async () => {
    try {
        await db.query(`DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 day'`);
    } catch (err) {
        console.error('[OTP] Error limpiando OTPs viejos:', err.message);
    }
}, 60 * 60 * 1000);

module.exports = { requestOTP, verifyOTP };
