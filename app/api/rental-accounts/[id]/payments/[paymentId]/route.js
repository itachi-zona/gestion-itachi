import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  await sql`
    DELETE FROM rental_account_payments
    WHERE id = ${params.paymentId} AND rental_account_id = ${params.id}
  `;
  return NextResponse.json({ ok: true });
}
