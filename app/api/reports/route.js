import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");
  const serviceSlug = searchParams.get("service");

  const ventasPorDia = await sql`
    SELECT pay.payment_date AS day, COALESCE(SUM(pay.amount), 0)::numeric AS total, COUNT(*)::int AS count
    FROM payments pay
    JOIN subscriptions sub ON sub.id = pay.subscription_id
    JOIN services s ON s.id = sub.service_id
    WHERE pay.status = 'pagado'
      AND (${from}::date IS NULL OR pay.payment_date >= ${from}::date)
      AND (${to}::date IS NULL OR pay.payment_date <= ${to}::date)
      AND (${serviceSlug}::text IS NULL OR s.slug = ${serviceSlug})
    GROUP BY pay.payment_date
    ORDER BY pay.payment_date DESC
    LIMIT 60
  `;

  const ingresosPorServicio = await sql`
    SELECT s.name, s.slug, COALESCE(SUM(pay.amount), 0)::numeric AS total, COUNT(*)::int AS count
    FROM payments pay
    JOIN subscriptions sub ON sub.id = pay.subscription_id
    JOIN services s ON s.id = sub.service_id
    WHERE pay.status = 'pagado'
      AND (${from}::date IS NULL OR pay.payment_date >= ${from}::date)
      AND (${to}::date IS NULL OR pay.payment_date <= ${to}::date)
    GROUP BY s.name, s.slug
    ORDER BY total DESC
  `;

  const serviciosMasVendidos = await sql`
    SELECT s.name, s.slug, COUNT(*)::int AS ventas
    FROM subscriptions sub
    JOIN services s ON s.id = sub.service_id
    WHERE sub.status <> 'cancelado'
    GROUP BY s.name, s.slug
    ORDER BY ventas DESC
  `;

  const clientesMasAntiguos = await sql`
    SELECT c.name, c.phone, MIN(sub.join_date) AS join_date,
      (CURRENT_DATE - MIN(sub.join_date)) AS dias_como_cliente
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    GROUP BY c.id, c.name, c.phone
    ORDER BY join_date ASC
    LIMIT 10
  `;

  const gananciaPorCuenta = await sql`
    SELECT a.email, s.name AS service_name, a.price AS costo_cuenta,
      COALESCE(SUM(sub.price), 0)::numeric AS ingresos_generados,
      (COALESCE(SUM(sub.price), 0) - COALESCE(a.price, 0))::numeric AS ganancia_estimada
    FROM accounts a
    JOIN services s ON s.id = a.service_id
    LEFT JOIN subscriptions sub ON sub.account_id = a.id AND sub.status <> 'cancelado'
    GROUP BY a.id, a.email, s.name, a.price
    ORDER BY ganancia_estimada DESC
  `;

  const [totales] = await sql`
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pagado'
        AND (${from}::date IS NULL OR payment_date >= ${from}::date)
        AND (${to}::date IS NULL OR payment_date <= ${to}::date))::numeric AS ingresos_totales,
      (SELECT COUNT(*) FROM payments WHERE status = 'pagado'
        AND (${from}::date IS NULL OR payment_date >= ${from}::date)
        AND (${to}::date IS NULL OR payment_date <= ${to}::date))::int AS pagos_totales
  `;

  return NextResponse.json({
    ventasPorDia,
    ingresosPorServicio,
    serviciosMasVendidos,
    clientesMasAntiguos,
    gananciaPorCuenta,
    totales
  });
}
