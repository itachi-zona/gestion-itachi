import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // Un usuario puede cambiar su propia contraseña; solo un admin puede cambiar la de otros.
  if (String(session.id) !== String(params.id) && session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { password, full_name, role } = await req.json();
  const hash = password ? await bcrypt.hash(password, 10) : null;
  const newRole = session.role === "admin" ? role || null : null;

  const rows = await sql`
    UPDATE users SET
      password_hash = COALESCE(${hash}, password_hash),
      full_name = COALESCE(${full_name}, full_name),
      role = COALESCE(${newRole}, role)
    WHERE id = ${params.id}
    RETURNING id, username, full_name, role, created_at
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  await sql`DELETE FROM users WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
