import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

async function buildContext() {
  const [totales] = await sql`
    SELECT
      (SELECT COUNT(DISTINCT client_id) FROM subscriptions WHERE status <> 'cancelado')::int AS clientes_activos,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'cancelado')::int AS clientes_cancelados,
      (SELECT COUNT(*) FROM subscriptions WHERE status <> 'cancelado' AND next_payment_date < CURRENT_DATE)::int AS vencidos,
      (SELECT COUNT(*) FROM subscriptions WHERE status <> 'cancelado' AND next_payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days')::int AS por_vencer,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='pagado' AND date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE))::numeric AS ingresos_mes,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='pagado' AND payment_date = CURRENT_DATE)::numeric AS ingresos_hoy,
      (SELECT COALESCE(SUM(price),0) FROM subscriptions WHERE status <> 'cancelado' AND next_payment_date < CURRENT_DATE)::numeric AS dinero_pendiente,
      (SELECT COUNT(*) FROM profiles WHERE status = 'libre')::int AS perfiles_libres,
      (SELECT COUNT(*) FROM accounts)::int AS total_cuentas
  `;

  const porServicio = await sql`
    SELECT s.name,
      (SELECT COUNT(*) FROM subscriptions sub WHERE sub.service_id = s.id AND sub.status <> 'cancelado')::int AS clientes,
      (SELECT COALESCE(SUM(pay.amount),0) FROM payments pay
        JOIN subscriptions sub ON sub.id = pay.subscription_id
        WHERE sub.service_id = s.id AND pay.status = 'pagado'
        AND date_trunc('month', pay.payment_date) = date_trunc('month', CURRENT_DATE))::numeric AS ingresos_mes
    FROM services s ORDER BY ingresos_mes DESC
  `;

  const topClientes = await sql`
    SELECT c.name, COALESCE(SUM(pay.amount),0)::numeric AS total_pagado, COUNT(pay.id)::int AS pagos
    FROM clients c
    JOIN subscriptions sub ON sub.client_id = c.id
    JOIN payments pay ON pay.subscription_id = sub.id AND pay.status = 'pagado'
    GROUP BY c.id, c.name
    ORDER BY total_pagado DESC
    LIMIT 10
  `;

  const proximosVencimientos = await sql`
    SELECT c.name AS cliente, s.name AS servicio, sub.next_payment_date, sub.price,
      (sub.next_payment_date - CURRENT_DATE) AS dias
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    JOIN services s ON s.id = sub.service_id
    WHERE sub.status <> 'cancelado'
    ORDER BY sub.next_payment_date ASC
    LIMIT 20
  `;

  const cancelacionesRecientes = await sql`
    SELECT c.name AS cliente, s.name AS servicio, sub.cancellation_reason, sub.cancelled_at
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    JOIN services s ON s.id = sub.service_id
    WHERE sub.status = 'cancelado'
    ORDER BY sub.cancelled_at DESC NULLS LAST
    LIMIT 15
  `;

  // Todas las cuentas principales con su correo, servicio y perfiles libres/ocupados
  const cuentas = await sql`
    SELECT a.id, a.email, s.name AS servicio, a.status, a.subscription_end,
      (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id)::int AS perfiles_totales,
      (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id AND p.status = 'libre')::int AS perfiles_libres
    FROM accounts a
    JOIN services s ON s.id = a.service_id
    ORDER BY s.name, a.email
    LIMIT 300
  `;

  // Detalle completo de cada cliente con suscripción activa: correo de la cuenta que usa,
  // PIN de su perfil, celular, próximo pago, días restantes, etc.
  const clientesDetalle = await sql`
    SELECT c.name AS cliente, c.phone AS celular, c.email AS correo_cliente,
      s.name AS servicio, sub.type AS tipo_venta,
      a.email AS correo_cuenta, p.profile_name AS perfil, p.pin,
      sub.price AS precio, sub.join_date AS fecha_inicio,
      sub.last_payment_date AS ultimo_pago, sub.next_payment_date AS proximo_pago,
      (sub.next_payment_date - CURRENT_DATE) AS dias_restantes,
      sub.has_guarantee, sub.guarantee_days
    FROM subscriptions sub
    JOIN clients c ON c.id = sub.client_id
    JOIN services s ON s.id = sub.service_id
    LEFT JOIN accounts a ON a.id = sub.account_id
    LEFT JOIN profiles p ON p.id = sub.profile_id
    WHERE sub.status <> 'cancelado'
    ORDER BY sub.next_payment_date ASC
    LIMIT 300
  `;

  return {
    fecha_actual: new Date().toISOString().slice(0, 10),
    resumen_general: totales,
    ingresos_por_servicio: porServicio,
    top_clientes_por_gasto: topClientes,
    proximos_vencimientos: proximosVencimientos,
    cancelaciones_recientes: cancelacionesRecientes,
    cuentas_registradas: cuentas,
    clientes_detalle: clientesDetalle
  };
}

// Cargar el historial guardado del usuario
export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const rows = await sql`
    SELECT role, content, created_at FROM chat_messages
    WHERE user_id = ${session.id}
    ORDER BY created_at ASC
    LIMIT 200
  `;
  return NextResponse.json(rows);
}

// Borrar el historial (botón "Nueva conversación")
export async function DELETE() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  await sql`DELETE FROM chat_messages WHERE user_id = ${session.id}`;
  return NextResponse.json({ ok: true });
}

export async function POST(req) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar GROQ_API_KEY en las variables de entorno del proyecto. Consigue una gratis en console.groq.com" },
      { status: 500 }
    );
  }

  const { content } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
  }

  // Guarda el mensaje del usuario
  await sql`INSERT INTO chat_messages (user_id, role, content) VALUES (${session.id}, 'user', ${content})`;

  // Trae el historial reciente (incluyendo el que se acaba de guardar) para dar contexto de la conversación
  const history = await sql`
    SELECT role, content FROM chat_messages
    WHERE user_id = ${session.id}
    ORDER BY created_at ASC
    LIMIT 30
  `;

  const context = await buildContext();

  const systemPrompt = `Eres el asistente de análisis de ventas del negocio de streaming del usuario (venta de perfiles y cuentas de Netflix, Disney+, ChatGPT, etc). Responde SIEMPRE en español, de forma breve, clara y directa, usando soles (S/) como moneda. Tienes acceso a los datos REALES y DETALLADOS del negocio en el JSON de abajo, incluyendo: la lista completa de cuentas registradas (correo, servicio, perfiles libres/ocupados) en "cuentas_registradas", y el detalle de cada cliente activo (nombre, celular, correo de la cuenta que usa, nombre del perfil, PIN, precio, fecha de próximo pago, días restantes, garantía) en "clientes_detalle". Usa estos datos para responder preguntas específicas como "cuántos correos tengo registrados", "cuál es el PIN de tal cliente", "cuándo vence tal cliente", "qué cuenta usa fulano", etc. Si te preguntan por una lista, respóndela completa y ordenada. Si algo no está en los datos, dilo honestamente en vez de inventar. No muestres el JSON crudo al usuario, interpreta y organiza la información en texto claro (puedes usar listas).

DATOS ACTUALES DEL NEGOCIO:
${JSON.stringify(context)}`;

  let apiRes;
  try {
    apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1536,
        messages: [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))]
      })
    });
  } catch (err) {
    console.error("Groq fetch error:", err);
    return NextResponse.json({ error: "No se pudo conectar con la IA." }, { status: 502 });
  }

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    console.error("Groq API error:", errText);
    return NextResponse.json({ error: "No se pudo obtener respuesta de la IA." }, { status: 502 });
  }

  const data = await apiRes.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta, intenta de nuevo.";

  await sql`INSERT INTO chat_messages (user_id, role, content) VALUES (${session.id}, 'assistant', ${reply})`;

  return NextResponse.json({ reply });
}
