import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const rows = await sql`
    SELECT * FROM rental_account_payments
    WHERE rental_account_id = ${params.id}
    ORDER BY payment_date DESC, id DESC
  `;
  return NextResponse.json(rows);
}

// Registra un nuevo pago. Opcionalmente puede renovar la cuenta actualizando
// su fecha de caducación y/o sus días adicionales (útil al renovar el mes).
export async function POST(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { payment_date, amount, new_expiration_date, extra_days } = await req.json();

  if (!payment_date) {
    return NextResponse.json({ error: "La fecha de pago es requerida." }, { status: 400 });
  }

  const payments = await sql`
    INSERT INTO rental_account_payments (rental_account_id, payment_date, amount)
    VALUES (${params.id}, ${payment_date}, ${amount || null})
    RETURNING *
  `;

  const rows = await sql`
    UPDATE rental_accounts SET
      last_payment_date = ${payment_date},
      amount = COALESCE(${amount}, amount),
      expiration_date = COALESCE(${new_expiration_date}, expiration_date),
      extra_days = COALESCE(${extra_days}, extra_days),
      status = 'activa'
    WHERE id = ${params.id}
    RETURNING *
  `;

  return NextResponse.json({ payment: payments[0], account: rows[0] }, { status: 201 });
}
