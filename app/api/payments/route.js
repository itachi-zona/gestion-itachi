import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subscriptionId = searchParams.get("subscription_id");

  const rows = subscriptionId
    ? await sql`
        SELECT pay.*, c.name AS client_name, c.phone AS client_phone, s.name AS service_name,
          sub.next_payment_date, sub.status AS sub_status, sub.type AS sub_type,
          a.email AS account_email, p.pin AS profile_pin, p.profile_name
        FROM payments pay
        JOIN subscriptions sub ON sub.id = pay.subscription_id
        JOIN clients c ON c.id = sub.client_id
        JOIN services s ON s.id = sub.service_id
        LEFT JOIN accounts a ON a.id = sub.account_id
        LEFT JOIN profiles p ON p.id = sub.profile_id
        WHERE pay.subscription_id = ${subscriptionId}
        ORDER BY pay.payment_date DESC
      `
    : await sql`
        SELECT pay.*, c.name AS client_name, c.phone AS client_phone, s.name AS service_name,
          sub.next_payment_date, sub.status AS sub_status, sub.type AS sub_type,
          a.email AS account_email, p.pin AS profile_pin, p.profile_name
        FROM payments pay
        JOIN subscriptions sub ON sub.id = pay.subscription_id
        JOIN clients c ON c.id = sub.client_id
        JOIN services s ON s.id = sub.service_id
        LEFT JOIN accounts a ON a.id = sub.account_id
        LEFT JOIN profiles p ON p.id = sub.profile_id
        ORDER BY pay.payment_date DESC, pay.id DESC
        LIMIT 300
      `;

  return NextResponse.json(rows);
}

// Registrar un pago manual (por ejemplo, desde la sección Pagos) sin pasar
// por el flujo de "renovar" de una suscripción.
export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { subscription_id, amount, payment_date, method } = await req.json();
  if (!subscription_id || !payment_date) {
    return NextResponse.json({ error: "Suscripción y fecha de pago son requeridas." }, { status: 400 });
  }

  // Evita registrar dos veces el mismo pago el mismo día para la misma suscripción.
  const existing = await sql`
    SELECT id FROM payments WHERE subscription_id = ${subscription_id} AND payment_date = ${payment_date}
  `;
  if (existing[0]) {
    return NextResponse.json({ error: "Ya existe un pago registrado para esta suscripción en esa fecha." }, { status: 409 });
  }

  const rows = await sql`
    INSERT INTO payments (subscription_id, amount, payment_date, method, status)
    VALUES (${subscription_id}, ${amount || null}, ${payment_date}, ${method || null}, 'pagado')
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
