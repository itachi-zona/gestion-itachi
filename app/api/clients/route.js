import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  // Trae cada cliente junto con todas sus suscripciones (puede tener varias: Netflix + ChatGPT, etc.)
  const clients = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
  const subs = await sql`
    SELECT sub.*, s.name AS service_name, s.slug AS service_slug,
      a.email AS account_email, p.profile_name, p.pin,
      (sub.next_payment_date - CURRENT_DATE) AS days_left
    FROM subscriptions sub
    JOIN services s ON s.id = sub.service_id
    LEFT JOIN accounts a ON a.id = sub.account_id
    LEFT JOIN profiles p ON p.id = sub.profile_id
    ORDER BY sub.next_payment_date ASC
  `;

  const byClient = {};
  for (const s of subs) {
    if (!byClient[s.client_id]) byClient[s.client_id] = [];
    byClient[s.client_id].push(s);
  }

  const result = clients.map((c) => ({ ...c, subscriptions: byClient[c.id] || [] }));
  return NextResponse.json(result);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { name, phone, email, notes } = await req.json();
  if (!name) return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });

  const rows = await sql`
    INSERT INTO clients (name, phone, email, notes)
    VALUES (${name}, ${phone || null}, ${email || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
