import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("service_id");

  const rows = serviceId
    ? await sql`
        SELECT a.*, s.name AS service_name, s.slug AS service_slug, s.max_profiles,
          (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id) AS total_profiles,
          (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id AND p.status = 'libre') AS free_profiles
        FROM accounts a
        JOIN services s ON s.id = a.service_id
        WHERE a.service_id = ${serviceId}
        ORDER BY a.created_at DESC
      `
    : await sql`
        SELECT a.*, s.name AS service_name, s.slug AS service_slug, s.max_profiles,
          (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id) AS total_profiles,
          (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id AND p.status = 'libre') AS free_profiles
        FROM accounts a
        JOIN services s ON s.id = a.service_id
        ORDER BY a.created_at DESC
      `;

  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { service_id, email, password, billing_date, subscription_end, price, notes, create_profiles } =
    await req.json();

  if (!service_id || !email || !password) {
    return NextResponse.json({ error: "Servicio, correo y contraseña son requeridos." }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO accounts (service_id, email, password, billing_date, subscription_end, price, notes)
    VALUES (${service_id}, ${email}, ${password}, ${billing_date || null}, ${subscription_end || null}, ${price || null}, ${notes || null})
    RETURNING *
  `;
  const account = rows[0];

  // Crea automáticamente los perfiles (Perfil 1..N) según el máximo del servicio
  if (create_profiles) {
    const svc = await sql`SELECT max_profiles FROM services WHERE id = ${service_id}`;
    const maxProfiles = svc[0]?.max_profiles || 1;
    for (let i = 1; i <= maxProfiles; i++) {
      await sql`INSERT INTO profiles (account_id, profile_name, status) VALUES (${account.id}, ${"Perfil " + i}, 'libre')`;
    }
  }

  return NextResponse.json(account, { status: 201 });
}
