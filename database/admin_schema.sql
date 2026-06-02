-- ============================================================
-- BYD Salma - Admin Schema
-- Tablas para entregas, comentarios, promociones, OTP, sesiones
-- ============================================================

-- =========== ENTREGAS ===========
CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_ciudad VARCHAR(100),
    modelo VARCHAR(80) NOT NULL,
    color VARCHAR(50),
    fecha_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,
    foto_principal VARCHAR(500) NOT NULL,
    foto_thumbnail VARCHAR(500),
    destacada BOOLEAN DEFAULT FALSE,
    publicada BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entregas_fecha ON entregas(fecha_entrega DESC);
CREATE INDEX IF NOT EXISTS idx_entregas_publicada ON entregas(publicada, fecha_entrega DESC);

-- =========== COMENTARIOS ===========
CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    ciudad VARCHAR(100),
    modelo_byd VARCHAR(80),
    texto TEXT NOT NULL,
    estrellas SMALLINT CHECK (estrellas BETWEEN 1 AND 5),
    aprobado BOOLEAN DEFAULT FALSE,
    destacado BOOLEAN DEFAULT FALSE,
    ip_origen VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    aprobado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comentarios_aprobado ON comentarios(aprobado, created_at DESC);

-- =========== PROMOCIONES ===========
CREATE TABLE IF NOT EXISTS promociones (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    subtitulo VARCHAR(220),
    descripcion TEXT,
    imagen VARCHAR(500),
    cta_texto VARCHAR(60) DEFAULT 'Más información',
    cta_url VARCHAR(300),
    color_acento VARCHAR(20) DEFAULT '#059669',
    vigente_desde DATE DEFAULT CURRENT_DATE,
    vigente_hasta DATE,
    activa BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promociones_activa ON promociones(activa, orden);

-- =========== OTP (códigos de un solo uso para login) ===========
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts SMALLINT DEFAULT 0,
    ip_origen VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, used, expires_at DESC);

-- =========== SESSIONS (connect-pg-simple) ===========
CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- =========== ADMIN USERS (quien puede recibir OTP) ===========
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(30) DEFAULT 'admin',
    activo BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: Salma como admin principal
INSERT INTO admin_users (nombre, phone, role)
VALUES ('Salma Zapata', '+528120272752', 'admin')
ON CONFLICT (phone) DO NOTHING;

-- =========== PAGE CONTENT (¿Qué es BYD? editable) ===========
CREATE TABLE IF NOT EXISTS page_content (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(80) UNIQUE NOT NULL,
    titulo VARCHAR(200),
    contenido_html TEXT,
    updated_by INT REFERENCES admin_users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed inicial: contenido del rincón BYD
INSERT INTO page_content (slug, titulo, contenido_html)
VALUES (
    'que-es-byd',
    '¿Qué es BYD?',
    '<p>BYD (Build Your Dreams) es el fabricante de vehículos eléctricos #1 del mundo, con más de 28 años de experiencia y operaciones en más de 70 países.</p>
    <h3>Tecnología Blade</h3>
    <p>Las baterías BYD Blade usan química LFP (litio-ferrofosfato), una de las más seguras y duraderas del mercado. Mantienen >80% de capacidad después de 8 años de uso.</p>
    <h3>Por qué confiar en BYD</h3>
    <ul>
        <li>#1 mundial en ventas de vehículos eléctricos</li>
        <li>Más de 3 millones de unidades vendidas globalmente</li>
        <li>Cobertura oficial en México con red de servicio</li>
        <li>Garantía de batería 8 años o 160,000 km</li>
    </ul>'
)
ON CONFLICT (slug) DO NOTHING;
