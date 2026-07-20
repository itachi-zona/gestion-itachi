import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const rows = await sql`SELECT * FROM settings WHERE id = 1`;
  return NextResponse.json(rows[0] || {});
}

export async function PUT(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const {
    business_name,
    whatsapp_number,
    telegram_user,
    currency,
    timezone,
    country,
    alert_days,
    default_guarantee_days,
    reminder_before,
    reminder_due,
    reminder_overdue
  } = await req.json();

  const rows = await sql`
    UPDATE settings SET
      business_name = COALESCE(${business_name}, business_name),
      whatsapp_number = COALESCE(${whatsapp_number}, whatsapp_number),
      telegram_user = COALESCE(${telegram_user}, telegram_user),
      currency = COALESCE(${currency}, currency),
      timezone = COALESCE(${timezone}, timezone),
      country = COALESCE(${country}, country),
      alert_days = COALESCE(${alert_days}, alert_days),
      default_guarantee_days = COALESCE(${default_guarantee_days}, default_guarantee_days),
      reminder_before = COALESCE(${reminder_before}, reminder_before),
      reminder_due = COALESCE(${reminder_due}, reminder_due),
      reminder_overdue = COALESCE(${reminder_overdue}, reminder_overdue),
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
