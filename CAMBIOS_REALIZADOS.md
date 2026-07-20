# Cambios realizados

## 1. Dos apartados independientes de clientes

- **Clientes por perfil**: `/dashboard/clientes/perfiles`
  - Muestra únicamente suscripciones por perfil.
  - Permite crear cliente, asignar perfil, renovar, cancelar y eliminar.
  - Incluye buscador, filtro por servicio y filtro por estado.

- **Clientes de cuentas completas**: `/dashboard/clientes/cuentas-completas`
  - Toma los datos existentes de `rental_accounts`.
  - Agrupa varias cuentas completas pertenecientes al mismo cliente.
  - Permite editar el contacto en una o en todas las cuentas del cliente.
  - Incluye buscador, filtro por servicio y filtro por estado.

## 2. Menú lateral reorganizado

El menú ahora separa claramente:

- Clientes
- Inventario
- Seguimiento

También se cambió el nombre de **Cuentas** a **Cuentas por perfiles** para evitar confusión con las cuentas completas.

## 3. Diseño mejorado

- Tarjetas con degradados y mejor jerarquía visual.
- Buscadores y filtros modernos.
- Nuevos estados vacíos y animaciones de carga.
- Modales más limpios.
- Sidebar más profesional.
- Mejor adaptación a diferentes tamaños de pantalla.

## 4. Neon

No se requiere ejecutar ningún SQL nuevo. Se usan las tablas que ya existen:

- `clients`
- `subscriptions`
- `rental_accounts`

## 5. Despliegue

1. Reemplaza los archivos del repositorio con esta versión.
2. Ejecuta `git add .`
3. Ejecuta `git commit -m "Separar clientes por perfil y cuenta completa"`
4. Ejecuta `git push`
5. Vercel iniciará el despliegue automáticamente.
