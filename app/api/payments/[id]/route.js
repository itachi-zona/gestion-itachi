import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  await sql`DELETE FROM payments WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { amount, payment_date, method, status } = await req.json();
  const rows = await sql`
    UPDATE payments SET
      amount = COALESCE(${amount}, amount),
      payment_date = COALESCE(${payment_date}, payment_date),
      method = COALESCE(${method}, method),
      status = COALESCE(${status}, status)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
