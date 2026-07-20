import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const rows = await sql`
    SELECT r.*, s.name AS service_name, s.slug AS service_slug,
      (r.expiration_date + (r.extra_days || ' days')::interval)::date AS final_expiration_date,
      ((r.expiration_date + (r.extra_days || ' days')::interval)::date - CURRENT_DATE) AS days_left
    FROM rental_accounts r
    LEFT JOIN services s ON s.id = r.service_id
    WHERE r.id = ${params.id}
  `;
  if (!rows[0]) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  const payments = await sql`
    SELECT * FROM rental_account_payments
    WHERE rental_account_id = ${params.id}
    ORDER BY payment_date DESC, id DESC
  `;

  return NextResponse.json({ ...rows[0], payments });
}

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const {
    service_id,
    email,
    password,
    client_name,
    account_created_date,
    expiration_date,
    extra_days,
    last_payment_date,
    amount,
    notes,
    status
  } = await req.json();

  const rows = await sql`
    UPDATE rental_accounts SET
      service_id = COALESCE(${service_id}, service_id),
      email = COALESCE(${email}, email),
      password = COALESCE(${password}, password),
      client_name = COALESCE(${client_name}, client_name),
      account_created_date = COALESCE(${account_created_date}, account_created_date),
      expiration_date = COALESCE(${expiration_date}, expiration_date),
      extra_days = COALESCE(${extra_days}, extra_days),
      last_payment_date = COALESCE(${last_payment_date}, last_payment_date),
      amount = COALESCE(${amount}, amount),
      notes = COALESCE(${notes}, notes),
      status = COALESCE(${status}, status)
    WHERE id = ${params.id}
    RETURNING *
  `;
  if (!rows[0]) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  await sql`DELETE FROM rental_accounts WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
