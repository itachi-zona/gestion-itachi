import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

function addMonthISO(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("service_id");

  const rows = serviceId
    ? await sql`
        SELECT r.*, s.name AS service_name, s.slug AS service_slug,
          (r.expiration_date + (r.extra_days || ' days')::interval)::date AS final_expiration_date,
          ((r.expiration_date + (r.extra_days || ' days')::interval)::date - CURRENT_DATE) AS days_left,
          (SELECT COUNT(*) FROM rental_account_payments p WHERE p.rental_account_id = r.id) AS payment_count
        FROM rental_accounts r
        LEFT JOIN services s ON s.id = r.service_id
        WHERE r.service_id = ${serviceId}
        ORDER BY r.created_at DESC
      `
    : await sql`
        SELECT r.*, s.name AS service_name, s.slug AS service_slug,
          (r.expiration_date + (r.extra_days || ' days')::interval)::date AS final_expiration_date,
          ((r.expiration_date + (r.extra_days || ' days')::interval)::date - CURRENT_DATE) AS days_left,
          (SELECT COUNT(*) FROM rental_account_payments p WHERE p.rental_account_id = r.id) AS payment_count
        FROM rental_accounts r
        LEFT JOIN services s ON s.id = r.service_id
        ORDER BY r.created_at DESC
      `;

  return NextResponse.json(rows);
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const {
    service_id,
    email,
    password,
    client_name,
    account_created_date,
    expiration_date,
    extra_days,
    last_payment_date,
    amount,
    notes
  } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contraseña son requeridos." }, { status: 400 });
  }

  const createdDate = account_created_date || new Date().toISOString().slice(0, 10);
  const expirationDate = expiration_date || addMonthISO(createdDate);

  const rows = await sql`
    INSERT INTO rental_accounts
      (service_id, email, password, client_name, account_created_date, expiration_date, extra_days, last_payment_date, amount, notes)
    VALUES
      (${service_id || null}, ${email}, ${password}, ${client_name || null}, ${createdDate}, ${expirationDate},
       ${extra_days || 0}, ${last_payment_date || null}, ${amount || null}, ${notes || null})
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
