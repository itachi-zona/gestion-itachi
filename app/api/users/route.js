import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

function requireAdmin() {
  const session = getSessionFromCookies();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const rows = await sql`SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { username, password, full_name, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son requeridos." }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Ese usuario ya existe." }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (${username}, ${hash}, ${full_name || null}, ${role === "admin" ? "admin" : "vendedor"})
    RETURNING id, username, full_name, role, created_at
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
