import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { name, slug, max_profiles, color } = await req.json();
  const rows = await sql`
    UPDATE services SET
      name = COALESCE(${name}, name),
      slug = COALESCE(${slug}, slug),
      max_profiles = COALESCE(${max_profiles}, max_profiles),
      color = COALESCE(${color}, color)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  // accounts.service_id tiene ON DELETE CASCADE (se borran cuentas y perfiles con el servicio),
  // pero subscriptions.service_id NO tiene cascada: hay que cancelarlas antes o la eliminación falla.
  await sql`
    UPDATE subscriptions SET status = 'cancelado', cancelled_at = now(),
      service_id = NULL, account_id = NULL, profile_id = NULL
    WHERE service_id = ${params.id}
  `;
  await sql`DELETE FROM services WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
