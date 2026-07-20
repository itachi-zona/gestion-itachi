import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // Liberar perfil: cancela la suscripción activa (si existe) y lo marca libre.
  if (action === "release") {
    const sub = await sql`
      SELECT * FROM subscriptions WHERE profile_id = ${params.id} AND status <> 'cancelado'
    `;
    if (sub[0]) {
      await sql`
        UPDATE subscriptions SET status = 'cancelado', cancelled_at = now(),
          cancellation_reason = COALESCE(${body.reason || null}, cancellation_reason)
        WHERE id = ${sub[0].id}
      `;
    }
    const rows = await sql`
      UPDATE profiles SET status = 'libre'
      WHERE id = ${params.id}
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  }

  const { profile_name, pin, status } = body;
  const rows = await sql`
    UPDATE profiles SET
      profile_name = COALESCE(${profile_name}, profile_name),
      pin = COALESCE(${pin}, pin),
      status = COALESCE(${status}, status)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  // Las suscripciones apuntan a este perfil con una FK sin cascada:
  // primero hay que cancelarlas / desvincularlas o el DELETE fallará.
  await sql`
    UPDATE subscriptions SET status = 'cancelado', cancelled_at = now(), profile_id = NULL
    WHERE profile_id = ${params.id} AND status <> 'cancelado'
  `;
  await sql`UPDATE subscriptions SET profile_id = NULL WHERE profile_id = ${params.id}`;
  await sql`DELETE FROM profiles WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
