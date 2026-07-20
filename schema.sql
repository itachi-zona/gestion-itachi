-- Streaming Manager - Esquema de base de datos para Neon (PostgreSQL)
-- Ejecuta esto UNA VEZ en el SQL Editor de tu proyecto de Neon.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'vendedor', -- 'admin' | 'vendedor'
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  max_profiles INT NOT NULL DEFAULT 1,
  color VARCHAR(20) DEFAULT '#6d5bf6',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  email VARCHAR(150) NOT NULL,
  password TEXT NOT NULL,
  billing_date DATE,
  subscription_end DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'activa', -- activa | vencida | cancelada
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  profile_name VARCHAR(50) NOT NULL,
  pin VARCHAR(4),
  status VARCHAR(20) NOT NULL DEFAULT 'libre', -- libre | ocupado
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  service_id INT REFERENCES services(id),
  account_id INT REFERENCES accounts(id),
  profile_id INT REFERENCES profiles(id),
  type VARCHAR(20) NOT NULL, -- 'perfil' | 'cuenta_completa'
  join_date DATE NOT NULL,
  last_payment_date DATE,
  next_payment_date DATE,
  price NUMERIC(10,2),
  has_guarantee BOOLEAN NOT NULL DEFAULT false,
  guarantee_days INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo | por_vencer | vencido | cancelado
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(10,2),
  payment_date DATE NOT NULL,
  method VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pagado',
  created_at TIMESTAMP DEFAULT now()
);

-- Servicios base (ajusta nombres/colores como quieras)
INSERT INTO services (name, slug, max_profiles, color) VALUES
  ('Netflix', 'netflix', 5, '#e50914'),
  ('Disney+', 'disney', 4, '#113CCF'),
  ('ChatGPT', 'chatgpt', 1, '#10a37f'),
  ('Gemini', 'gemini', 1, '#8b7bff'),
  ('Otras apps', 'otras', 1, '#6d5bf6')
ON CONFLICT (slug) DO NOTHING;

-- Usuario admin inicial: usuario "admin" / contraseña "Itachi2026"
-- (el hash de abajo corresponde a esa contraseña con bcrypt, cámbiala apenas entres)
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin', '$2b$10$EHRFtiobdvn2KJsLiU5X1etVhvevwRgnKgdg24cKSmlBpZGN3SCa6', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- MIGRACIÓN: nuevas columnas y tabla de ajustes
-- Seguro de correr aunque ya tengas la base de datos creada
-- (usa IF NOT EXISTS / ON CONFLICT en todo).
-- ============================================================

-- Motivo de cancelación en las suscripciones
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50);

-- Notas libres por perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ajustes generales del negocio (una sola fila, id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name VARCHAR(100) DEFAULT 'Streaming Manager',
  whatsapp_number VARCHAR(30),
  telegram_user VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'PEN',
  timezone VARCHAR(50) DEFAULT 'America/Lima',
  country VARCHAR(50) DEFAULT 'Perú',
  alert_days INT NOT NULL DEFAULT 3,
  default_guarantee_days INT NOT NULL DEFAULT 3,
  reminder_before TEXT DEFAULT 'Hola, tu servicio de {servicio} vence en {dias} días. El monto de renovación es de S/{monto}. Puedes realizar el pago para continuar con tu servicio.',
  reminder_due TEXT DEFAULT 'Hola, hoy vence tu servicio de {servicio}. El monto pendiente es de S/{monto}. Confírmame cuando realices el pago para renovar tu servicio.',
  reminder_overdue TEXT DEFAULT 'Hola, tu servicio de {servicio} se encuentra vencido. El monto pendiente es de S/{monto}. El acceso puede ser suspendido hasta confirmar la renovación.',
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Historial del Chat IA (para que no se borre al recargar la página)
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================
-- CUENTAS COMPLETAS EN ALQUILER
-- A diferencia de "accounts" (que se reparte por perfiles), aquí se
-- alquila la cuenta ENTERA a un solo cliente. Guarda correo/contraseña
-- (editables sin necesidad de borrar la cuenta), fecha de creación,
-- fecha de caducación (1 mes por defecto) más días adicionales de
-- gracia aparte de la caducación, y un historial de pagos con fecha
-- y monto para poder llevar el conteo y avisar cuando esté por vencer.
-- Seguro de correr aunque ya tengas la base de datos creada.
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_accounts (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id),
  email VARCHAR(150) NOT NULL,
  password TEXT NOT NULL,
  client_name VARCHAR(100),
  account_created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  extra_days INT NOT NULL DEFAULT 0,
  last_payment_date DATE,
  amount NUMERIC(10,2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'activa', -- activa | vencida | cancelada
  created_at TIMESTAMP DEFAULT now()
);

-- Historial de pagos de cada cuenta completa en alquiler (conteo de pagos)
CREATE TABLE IF NOT EXISTS rental_account_payments (
  id SERIAL PRIMARY KEY,
  rental_account_id INT REFERENCES rental_accounts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT now()
);

-- Datos de contacto del cliente que alquila la cuenta completa, y datos del
-- PROVEEDOR al que le compras/alquilas esa cuenta (a quién le pagas tú):
-- cuánto le pagas, cuándo le pagaste la última vez y cuándo le debes pagar.
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(30);
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS client_email VARCHAR(150);
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100);
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS provider_amount NUMERIC(10,2);
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS provider_last_payment_date DATE;
ALTER TABLE rental_accounts ADD COLUMN IF NOT EXISTS provider_next_payment_date DATE;
