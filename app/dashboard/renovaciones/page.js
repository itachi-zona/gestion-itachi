"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildMessage(sub) {
  const days = Number(sub.days_left);
  const amount = sub.price ? Number(sub.price).toFixed(2) : "—";
  if (days < 0) {
    return `Hola, tu servicio de ${sub.service_name} se encuentra vencido. El monto pendiente es de S/${amount}. El acceso puede ser suspendido hasta confirmar la renovación.`;
  }
  if (days === 0) {
    return `Hola, hoy vence tu servicio de ${sub.service_name}. El monto pendiente es de S/${amount}. Confírmame cuando realices el pago para renovar tu servicio.`;
  }
  return `Hola, tu servicio de ${sub.service_name} vence en ${days} día${days === 1 ? "" : "s"}. El monto de renovación es de S/${amount}. Puedes realizar el pago para continuar con tu servicio.`;
}

export default function RenovacionesPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewForm, setRenewForm] = useState(null);
  const [filter, setFilter] = useState("todos");

  async function load() {
    setLoading(true);
    const rows = await fetch("/api/subscriptions").then((r) => r.json());
    setSubs(rows.filter((s) => s.status !== "cancelado"));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (filter === "vencido") return s.computed_status === "vencido";
      if (filter === "por_vencer") return s.computed_status === "por_vencer";
      return true;
    });
  }, [subs, filter]);

  async function quickRenew(sub, days) {
    const today = new Date().toISOString().slice(0, 10);
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "renew",
        payment_date: today,
        next_payment_date: addDays(today, days),
        amount: sub.price
      })
    });
    load();
  }

  async function cancelSub(sub) {
    const reason = prompt("Motivo de cancelación (opcional):", "No realizó el pago");
    if (reason === null) return;
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason })
    });
    load();
  }

  async function submitCustomRenew(e) {
    e.preventDefault();
    await fetch(`/api/subscriptions/${renewForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "renew",
        payment_date: renewForm.payment_date,
        next_payment_date: renewForm.next_payment_date,
        amount: renewForm.amount,
        method: renewForm.method
      })
    });
    setRenewForm(null);
    load();
  }

  function copyMessage(sub) {
    const msg = buildMessage(sub);
    navigator.clipboard?.writeText(msg);
    alert("Mensaje copiado al portapapeles:\n\n" + msg);
  }

  function openWhatsApp(sub) {
    const msg = encodeURIComponent(buildMessage(sub));
    const phone = (sub.client_phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  return (
    <div>
      <Topbar title="Renovaciones" />

      <div className="flex gap-2 mb-6 -mt-2">
        {[
          ["todos", "Todos"],
          ["por_vencer", "Por vencer"],
          ["vencido", "Vencidos"]
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              filter === k ? "bg-accent border-accent text-white" : "border-border text-gray-400 hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Servicio</th>
              <th>Plan</th>
              <th>Precio</th>
              <th>Último pago</th>
              <th>Próximo pago</th>
              <th>Días</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.client_name}</td>
                <td className="text-gray-400">{s.client_phone || "—"}</td>
                <td>{s.service_name}</td>
                <td className="text-gray-400">{s.type === "perfil" ? "Perfil" : "Cuenta completa"}</td>
                <td>{s.price ? `S/ ${Number(s.price).toFixed(2)}` : "—"}</td>
                <td className="text-gray-400">{s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString() : "—"}</td>
                <td className="text-gray-400">{s.next_payment_date ? new Date(s.next_payment_date).toLocaleDateString() : "—"}</td>
                <td className={Number(s.days_left) < 0 ? "text-red-400" : ""}>{Number(s.days_left)}</td>
                <td>
                  <span className={`badge ${s.computed_status === "vencido" ? "badge-bad" : s.computed_status === "por_vencer" ? "badge-warn" : "badge-good"}`}>
                    {s.computed_status === "vencido" ? "Vencido" : s.computed_status === "por_vencer" ? "Por vencer" : "Activo"}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap space-x-2">
                  <div className="flex flex-wrap gap-1 justify-end">
                    <button className="text-xs text-accent-light hover:underline" onClick={() => quickRenew(s, 30)}>+30d</button>
                    <button className="text-xs text-accent-light hover:underline" onClick={() => quickRenew(s, 90)}>+3m</button>
                    <button className="text-xs text-accent-light hover:underline" onClick={() => quickRenew(s, 180)}>+6m</button>
                    <button
                      className="text-xs text-gray-300 hover:underline"
                      onClick={() =>
                        setRenewForm({
                          id: s.id,
                          payment_date: new Date().toISOString().slice(0, 10),
                          next_payment_date: "",
                          amount: s.price || "",
                          method: "Yape"
                        })
                      }
                    >
                      Personalizado
                    </button>
                    <button className="text-xs text-green-400 hover:underline" onClick={() => openWhatsApp(s)}>WhatsApp</button>
                    <button className="text-xs text-gray-400 hover:underline" onClick={() => copyMessage(s)}>Copiar msj</button>
                    <button className="text-xs text-red-400 hover:underline" onClick={() => cancelSub(s)}>Cancelar</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-gray-500 py-6">
                  No hay suscripciones en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {renewForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-4">Registrar renovación / pago</h2>
            <form onSubmit={submitCustomRenew} className="space-y-4">
              <div>
                <label className="label">Fecha de pago</label>
                <input type="date" className="input" required value={renewForm.payment_date} onChange={(e) => setRenewForm({ ...renewForm, payment_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Próximo pago (nueva fecha)</label>
                <input type="date" className="input" required value={renewForm.next_payment_date} onChange={(e) => setRenewForm({ ...renewForm, next_payment_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Monto (S/)</label>
                <input type="number" step="0.01" className="input" value={renewForm.amount} onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Método de pago</label>
                <select className="input" value={renewForm.method || "Yape"} onChange={(e) => setRenewForm({ ...renewForm, method: e.target.value })}>
                  <option value="Yape">Yape</option>
                  <option value="Plin">Plin</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-primary">Confirmar</button>
                <button type="button" className="btn-secondary" onClick={() => setRenewForm(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
