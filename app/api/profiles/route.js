import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // ej. 'libre'
  const accountId = searchParams.get("account_id");

  const rows = await sql`
    SELECT p.*, a.email AS account_email, a.id AS account_id,
      s.name AS service_name, s.slug AS service_slug,
      sub.id AS subscription_id, sub.client_id, sub.join_date, sub.last_payment_date,
      sub.next_payment_date, sub.price AS sub_price, sub.status AS sub_status,
      sub.has_guarantee, sub.guarantee_days,
      c.name AS client_name, c.phone AS client_phone,
      (sub.next_payment_date - CURRENT_DATE) AS days_left
    FROM profiles p
    JOIN accounts a ON a.id = p.account_id
    JOIN services s ON s.id = a.service_id
    LEFT JOIN subscriptions sub ON sub.profile_id = p.id AND sub.status <> 'cancelado'
    LEFT JOIN clients c ON c.id = sub.client_id
    WHERE (${status}::text IS NULL OR p.status = ${status})
      AND (${accountId}::text IS NULL OR p.account_id = ${accountId})
    ORDER BY s.name ASC, a.email ASC, p.id ASC
  `;

  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { account_id, profile_name, pin } = await req.json();
  if (!account_id || !profile_name) {
    return NextResponse.json({ error: "Cuenta y nombre de perfil son requeridos." }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO profiles (account_id, profile_name, pin, status)
    VALUES (${account_id}, ${profile_name}, ${pin || null}, 'libre')
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
