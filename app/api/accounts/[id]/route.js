import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const rows = await sql`
    SELECT a.*, s.name AS service_name, s.slug AS service_slug, s.max_profiles
    FROM accounts a JOIN services s ON s.id = a.service_id
    WHERE a.id = ${params.id}
  `;
  if (!rows[0]) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  const profiles = await sql`
    SELECT p.*, c.name AS client_name, c.phone AS client_phone,
      sub.id AS subscription_id, sub.join_date, sub.last_payment_date, sub.next_payment_date,
      (sub.next_payment_date - CURRENT_DATE) AS days_left
    FROM profiles p
    LEFT JOIN subscriptions sub ON sub.profile_id = p.id AND sub.status <> 'cancelado'
    LEFT JOIN clients c ON c.id = sub.client_id
    WHERE p.account_id = ${params.id}
    ORDER BY p.id ASC
  `;

  return NextResponse.json({ ...rows[0], profiles });
}

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { email, password, billing_date, subscription_end, status, price, notes } = await req.json();

  const rows = await sql`
    UPDATE accounts SET
      email = COALESCE(${email}, email),
      password = COALESCE(${password}, password),
      billing_date = COALESCE(${billing_date}, billing_date),
      subscription_end = COALESCE(${subscription_end}, subscription_end),
      status = COALESCE(${status}, status),
      price = COALESCE(${price}, price),
      notes = COALESCE(${notes}, notes)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  // subscriptions.account_id no tiene ON DELETE CASCADE: hay que cancelarlas primero
  // o la eliminación de la cuenta fallará por la restricción de llave foránea.
  await sql`
    UPDATE subscriptions SET status = 'cancelado', cancelled_at = now(), account_id = NULL, profile_id = NULL
    WHERE account_id = ${params.id}
  `;
  await sql`DELETE FROM accounts WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
