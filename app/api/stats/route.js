import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const [clientesActivos] = await sql`
    SELECT COUNT(DISTINCT client_id)::int AS n FROM subscriptions WHERE status <> 'cancelado'
  `;
  const [clientesNuevosMes] = await sql`
    SELECT COUNT(*)::int AS n FROM clients
    WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
  `;
  const [cuentas] = await sql`SELECT COUNT(*)::int AS n FROM accounts`;
  const [perfilesVendidos] = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions WHERE status <> 'cancelado' AND type = 'perfil'
  `;
  const [cuentasCompletasVendidas] = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions WHERE status <> 'cancelado' AND type = 'cuenta_completa'
  `;
  const [porVencer] = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions
    WHERE status <> 'cancelado' AND next_payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  `;
  const [vencidos] = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions
    WHERE status <> 'cancelado' AND next_payment_date < CURRENT_DATE
  `;
  const [cancelados] = await sql`SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'cancelado'`;
  const [perfilesLibres] = await sql`SELECT COUNT(*)::int AS n FROM profiles WHERE status = 'libre'`;

  const [ingresosDia] = await sql`
    SELECT COALESCE(SUM(amount), 0)::numeric AS n FROM payments
    WHERE payment_date = CURRENT_DATE AND status = 'pagado'
  `;
  const [ingresosMes] = await sql`
    SELECT COALESCE(SUM(amount), 0)::numeric AS n FROM payments
    WHERE date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE) AND status = 'pagado'
  `;
  const [pendienteCobro] = await sql`
    SELECT COALESCE(SUM(price), 0)::numeric AS n FROM subscriptions
    WHERE status <> 'cancelado' AND next_payment_date < CURRENT_DATE
  `;

  const porServicio = await sql`
    SELECT s.name, s.slug,
      (SELECT COUNT(*) FROM accounts a WHERE a.service_id = s.id)::int AS cuentas,
      (SELECT COUNT(*) FROM subscriptions sub WHERE sub.service_id = s.id AND sub.status <> 'cancelado')::int AS clientes
    FROM services s ORDER BY s.id
  `;

  const paganHoy = await sql`
    SELECT sub.id, c.name AS client_name, c.phone AS client_phone, s.name AS service_name,
      sub.type, sub.price, sub.next_payment_date
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    JOIN services s ON s.id = sub.service_id
    WHERE sub.status <> 'cancelado' AND sub.next_payment_date = CURRENT_DATE
    ORDER BY c.name
  `;
  const paganManana = await sql`
    SELECT COUNT(*)::int AS n FROM subscriptions
    WHERE status <> 'cancelado' AND next_payment_date = CURRENT_DATE + INTERVAL '1 day'
  `;

  const proximosPagos = await sql`
    SELECT sub.id, c.name AS client_name, c.phone AS client_phone, s.name AS service_name,
      sub.type, sub.price, sub.last_payment_date, sub.next_payment_date,
      (sub.next_payment_date - CURRENT_DATE) AS days_left,
      CASE
        WHEN sub.next_payment_date < CURRENT_DATE THEN 'vencido'
        WHEN sub.next_payment_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'por_vencer'
        ELSE 'activo'
      END AS computed_status
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    JOIN services s ON s.id = sub.service_id
    WHERE sub.status <> 'cancelado'
    ORDER BY sub.next_payment_date ASC
    LIMIT 15
  `;

  return NextResponse.json({
    clientesActivos: clientesActivos.n,
    clientesNuevosMes: clientesNuevosMes.n,
    cuentas: cuentas.n,
    perfilesVendidos: perfilesVendidos.n,
    cuentasCompletasVendidas: cuentasCompletasVendidas.n,
    porVencer: porVencer.n,
    vencidos: vencidos.n,
    cancelados: cancelados.n,
    perfilesLibres: perfilesLibres.n,
    ingresosDia: Number(ingresosDia.n),
    ingresosMes: Number(ingresosMes.n),
    pendienteCobro: Number(pendienteCobro.n),
    paganMananaCount: paganManana[0].n,
    paganHoy,
    porServicio,
    proximosPagos
  });
}
