import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await req.json();
  const { action } = body; // 'renew' | 'cancel' | 'reactivate' | 'update'

  if (action === "renew") {
    const { payment_date, next_payment_date, amount, method } = body;
    if (!payment_date || !next_payment_date) {
      return NextResponse.json({ error: "Fecha de pago y próxima fecha son requeridas." }, { status: 400 });
    }
    const rows = await sql`
      UPDATE subscriptions SET
        last_payment_date = ${payment_date},
        next_payment_date = ${next_payment_date},
        status = 'activo'
      WHERE id = ${params.id}
      RETURNING *
    `;

    // Evita registrar dos veces el mismo pago el mismo día para esta suscripción.
    const existing = await sql`
      SELECT id FROM payments WHERE subscription_id = ${params.id} AND payment_date = ${payment_date}
    `;
    if (!existing[0]) {
      await sql`
        INSERT INTO payments (subscription_id, amount, payment_date, method, status)
        VALUES (${params.id}, ${amount || rows[0].price}, ${payment_date}, ${method || null}, 'pagado')
      `;
    }
    return NextResponse.json(rows[0]);
  }

  if (action === "cancel") {
    const { reason } = body;
    const rows = await sql`
      UPDATE subscriptions SET status = 'cancelado', cancelled_at = now(),
        cancellation_reason = ${reason || null}
      WHERE id = ${params.id}
      RETURNING *
    `;
    const sub = rows[0];
    if (sub?.type === "perfil" && sub.profile_id) {
      await sql`UPDATE profiles SET status = 'libre' WHERE id = ${sub.profile_id}`;
    }
    return NextResponse.json(sub);
  }

  if (action === "reactivate") {
    const { next_payment_date } = body;
    // Si el perfil que tenía asignado ya está ocupado por otro cliente, no se puede reactivar sobre él.
    const current = await sql`SELECT * FROM subscriptions WHERE id = ${params.id}`;
    if (current[0]?.type === "perfil" && current[0].profile_id) {
      const profile = await sql`SELECT status FROM profiles WHERE id = ${current[0].profile_id}`;
      if (profile[0] && profile[0].status !== "libre") {
        return NextResponse.json(
          { error: "El perfil que tenía este cliente ya está ocupado. Asígnale uno nuevo desde una nueva suscripción." },
          { status: 409 }
        );
      }
    }
    const rows = await sql`
      UPDATE subscriptions SET status = 'activo', cancelled_at = NULL, cancellation_reason = NULL,
        next_payment_date = COALESCE(${next_payment_date || null}, next_payment_date)
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (rows[0]?.type === "perfil" && rows[0].profile_id) {
      await sql`UPDATE profiles SET status = 'ocupado' WHERE id = ${rows[0].profile_id}`;
    }
    return NextResponse.json(rows[0]);
  }

  // Actualización genérica (garantía, precio, notas, fechas manuales)
  const { next_payment_date, price, has_guarantee, guarantee_days } = body;
  const rows = await sql`
    UPDATE subscriptions SET
      next_payment_date = COALESCE(${next_payment_date}, next_payment_date),
      price = COALESCE(${price}, price),
      has_guarantee = COALESCE(${has_guarantee}, has_guarantee),
      guarantee_days = COALESCE(${guarantee_days}, guarantee_days)
    WHERE id = ${params.id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const sub = await sql`SELECT * FROM subscriptions WHERE id = ${params.id}`;
  if (sub[0]?.type === "perfil" && sub[0].profile_id) {
    await sql`UPDATE profiles SET status = 'libre' WHERE id = ${sub[0].profile_id}`;
  }
  await sql`DELETE FROM subscriptions WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
