import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const rows = await sql`SELECT * FROM services ORDER BY id ASC`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { name, slug, max_profiles, color } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "Nombre y slug son requeridos." }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO services (name, slug, max_profiles, color)
    VALUES (${name}, ${slug}, ${max_profiles || 1}, ${color || "#6d5bf6"})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
