import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceSlug = searchParams.get("service");

  const rows = serviceSlug
    ? await sql`
        SELECT sub.*, c.name AS client_name, c.phone AS client_phone,
          s.name AS service_name, s.slug AS service_slug,
          a.email AS account_email, p.profile_name, p.pin,
          (sub.next_payment_date - CURRENT_DATE) AS days_left,
          CASE
            WHEN sub.status = 'cancelado' THEN 'cancelado'
            WHEN sub.next_payment_date < CURRENT_DATE THEN 'vencido'
            WHEN sub.next_payment_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'por_vencer'
            ELSE 'activo'
          END AS computed_status
        FROM subscriptions sub
        JOIN clients c ON c.id = sub.client_id
        JOIN services s ON s.id = sub.service_id
        LEFT JOIN accounts a ON a.id = sub.account_id
        LEFT JOIN profiles p ON p.id = sub.profile_id
        WHERE s.slug = ${serviceSlug}
        ORDER BY sub.next_payment_date ASC
      `
    : await sql`
        SELECT sub.*, c.name AS client_name, c.phone AS client_phone,
          s.name AS service_name, s.slug AS service_slug,
          a.email AS account_email, p.profile_name, p.pin,
          (sub.next_payment_date - CURRENT_DATE) AS days_left,
          CASE
            WHEN sub.status = 'cancelado' THEN 'cancelado'
            WHEN sub.next_payment_date < CURRENT_DATE THEN 'vencido'
            WHEN sub.next_payment_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'por_vencer'
            ELSE 'activo'
          END AS computed_status
        FROM subscriptions sub
        JOIN clients c ON c.id = sub.client_id
        JOIN services s ON s.id = sub.service_id
        LEFT JOIN accounts a ON a.id = sub.account_id
        LEFT JOIN profiles p ON p.id = sub.profile_id
        ORDER BY sub.next_payment_date ASC
      `;

  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const {
    client_id,
    service_id,
    account_id,
    profile_id,
    type, // 'perfil' | 'cuenta_completa'
    join_date,
    last_payment_date,
    next_payment_date,
    price,
    has_guarantee,
    guarantee_days
  } = await req.json();

  if (!client_id || !service_id || !account_id || !type || !join_date || !next_payment_date) {
    return NextResponse.json({ error: "Faltan datos requeridos para crear la suscripción." }, { status: 400 });
  }

  if (type === "perfil" && !profile_id) {
    return NextResponse.json({ error: "Debes indicar qué perfil se le asigna al cliente." }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO subscriptions
      (client_id, service_id, account_id, profile_id, type, join_date, last_payment_date, next_payment_date, price, has_guarantee, guarantee_days, status)
    VALUES
      (${client_id}, ${service_id}, ${account_id}, ${profile_id || null}, ${type}, ${join_date}, ${last_payment_date || join_date}, ${next_payment_date}, ${price || null}, ${!!has_guarantee}, ${guarantee_days || 0}, 'activo')
    RETURNING *
  `;

  if (type === "perfil") {
    await sql`UPDATE profiles SET status = 'ocupado' WHERE id = ${profile_id}`;
  }

  if (last_payment_date || join_date) {
    const payDate = last_payment_date || join_date;
    const existing = await sql`
      SELECT id FROM payments WHERE subscription_id = ${rows[0].id} AND payment_date = ${payDate}
    `;
    if (!existing[0]) {
      await sql`
        INSERT INTO payments (subscription_id, amount, payment_date, status)
        VALUES (${rows[0].id}, ${price || null}, ${payDate}, 'pagado')
      `;
    }
  }

  return NextResponse.json(rows[0], { status: 201 });
}
