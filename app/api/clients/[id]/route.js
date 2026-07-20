import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { name, phone, email, notes } = await req.json();
  const rows = await sql`
    UPDATE clients SET
      name = COALESCE(${name}, name),
      phone = COALESCE(${phone}, phone),
      email = COALESCE(${email}, email),
      notes = COALESCE(${notes}, notes)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // Libera los perfiles que este cliente tenía asignados antes de que la cascada
  // borre sus suscripciones (si no, quedarían marcados "ocupado" para siempre).
  await sql`
    UPDATE profiles SET status = 'libre'
    WHERE id IN (SELECT profile_id FROM subscriptions WHERE client_id = ${params.id} AND profile_id IS NOT NULL)
  `;
  await sql`DELETE FROM clients WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
