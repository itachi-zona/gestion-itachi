# Streaming Manager

Sistema de gestión de clientes, cuentas y renovaciones para tu negocio de reventa de
suscripciones (Netflix, Disney+, ChatGPT, Gemini, otras apps).

- **Base de datos:** Neon (PostgreSQL)
- **Backend + Frontend:** Next.js 14 (App Router), desplegado en Vercel
- **Repositorio:** GitHub

Tiene dos apartados:

1. **Panel Admin** (`/admin`): solo para ti. Aquí creas los usuarios/contraseñas que
   podrán entrar al panel de gestión (por ejemplo, tú mismo o alguien que te ayude
   a atender clientes).
2. **Panel de gestión** (`/dashboard`): donde se administra todo — clientes, cuentas,
   perfiles, PINs, pagos, garantías, renovaciones y cancelaciones.

---

## 1. Crear la base de datos en Neon

1. Entra a [neon.tech](https://neon.tech) e inicia sesión (o crea cuenta).
2. Crea un **New Project** (elige la región más cercana a Perú, ej. AWS US East).
3. Dentro del proyecto, ve a **SQL Editor**.
4. Abre el archivo `schema.sql` de esta carpeta, copia todo su contenido, pégalo en el
   SQL Editor de Neon y dale **Run**. Esto crea todas las tablas, los servicios base
   (Netflix, Disney+, ChatGPT, Gemini, Otras apps) y un usuario admin inicial:
   - Usuario: `admin`
   - Contraseña: `Itachi2026`
   - **Cámbiala apenas entres** (ver paso 5, sección "Cambiar la contraseña admin").
5. Ve a **Dashboard > Connection Details** y copia la cadena de conexión tipo
   **"Pooled connection"** (empieza con `postgresql://...` y termina en
   `?sslmode=require`). La necesitarás en el paso 3.

## 2. Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado), por ejemplo
   `streaming-manager`.
2. Desde tu computadora, dentro de esta carpeta descomprimida:
   ```bash
   git init
   git add .
   git commit -m "Streaming Manager - primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/streaming-manager.git
   git push -u origin main
   ```
   (El archivo `.gitignore` ya excluye `node_modules`, `.env` y `.next`, así que no
   subirás nada innecesario ni tus contraseñas).

## 3. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. **Add New > Project**, selecciona el repositorio `streaming-manager` que acabas
   de subir.
3. Antes de darle "Deploy", abre la sección **Environment Variables** y agrega:
   - `DATABASE_URL` → la cadena de conexión de Neon que copiaste en el paso 1.5.
   - `JWT_SECRET` → cualquier texto largo y aleatorio que tú inventes (por ejemplo,
     genera uno en https://generate-secret.vercel.app/32 y pégalo aquí). Esto firma
     las sesiones de login, no lo compartas.
4. Dale **Deploy**. En 1-2 minutos tendrás tu URL, por ejemplo
   `streaming-manager.vercel.app`.

## 4. Primer ingreso y cambio de contraseña

1. Entra a `https://tu-proyecto.vercel.app` → te llevará a `/login`.
2. Ingresa con `admin` / `Itachi2026`.
3. Como es el usuario `admin`, entrarás directo al **Panel Admin**.
4. Ahí mismo crea tu usuario real de trabajo (o cambia el rol), y luego —muy
   importante— entra al SQL Editor de Neon y borra o cambia la contraseña del
   usuario `admin` de fábrica, o simplemente crea tu propio admin y elimina el
   de prueba desde el propio panel (botón "Eliminar" junto a `admin`, una vez que
   tengas otro usuario admin creado para no quedarte sin acceso).

## 5. Uso diario

- **Servicios**: ya vienen creados Netflix, Disney+, ChatGPT, Gemini y "Otras apps".
  Puedes agregar más (ej. Spotify, Crunchyroll) desde `/dashboard/servicios`,
  indicando cuántos perfiles caben por cuenta.
- **Cuentas y perfiles**: en `/dashboard/cuentas`, crea la cuenta (correo, contraseña,
  fecha de facturación, fin de suscripción). Si activas "Crear perfiles
  automáticamente", se generan los perfiles (Perfil 1, Perfil 2...) según el máximo
  configurado para ese servicio. Ahí mismo puedes poner el PIN de 4 dígitos a cada
  perfil y ver cuántos quedan libres.
- **Clientes**: en `/dashboard/clientes`, crea el cliente y luego usa "+ Suscripción"
  para asignarle un servicio: eliges la cuenta, si es "Perfil compartido" (elige un
  perfil libre) o "Cuenta completa", la fecha de ingreso, el próximo pago, el precio
  y los días de garantía (0 = sin garantía). El sistema calcula automáticamente los
  días restantes y el estado (Activo / Por vencer / Vencido).
- **Renovar**: botón "Renovar" registra el nuevo pago y mueve la fecha de siguiente
  cobro; queda en el historial de `/dashboard/pagos`.
- **Cancelar**: botón "Cancelar" marca la suscripción como cancelada y libera el
  perfil automáticamente para poder asignarlo a otro cliente.

---

## Desarrollo local (opcional)

Si quieres probarlo en tu PC antes de subir cambios:

```bash
npm install
cp .env.example .env.local   # y pon ahí tu DATABASE_URL y JWT_SECRET reales
npm run dev
```

Abre `http://localhost:3000`.

## Notas y siguientes mejoras sugeridas

Cosas que no vienen incluidas todavía pero que puedes pedirme después:

- Notificaciones automáticas por WhatsApp/email cuando un pago está por vencer.
- Exportar clientes/pagos a Excel o CSV.
- Registro de actividad (quién hizo qué y cuándo).
- Roles más granulares (ej. un vendedor que solo vea sus propios clientes).
- Página pública para que el cliente final vea su propio código/estado de cuenta.

## Separación de clientes (actualización)

El menú **Clientes** ahora tiene dos apartados independientes:

- **Clientes por perfil**: usa las tablas `clients` y `subscriptions`, mostrando únicamente suscripciones de tipo `perfil`.
- **Clientes cuenta completa**: usa directamente `rental_accounts` y agrupa las cuentas por nombre, teléfono y correo del cliente.

No se necesita ejecutar una migración nueva en Neon para esta actualización. Solo se deben subir los archivos modificados a GitHub; Vercel reconstruirá el proyecto automáticamente.
