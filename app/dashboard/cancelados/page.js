"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function CanceladosPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const rows = await fetch("/api/subscriptions").then((r) => r.json());
    setSubs(rows.filter((s) => s.status === "cancelado"));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function reactivate(sub) {
    const nextPayment = prompt("Nueva fecha de próximo pago (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!nextPayment) return;
    setError("");
    const res = await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reactivate", next_payment_date: nextPayment })
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo reactivar el cliente.");
      return;
    }
    load();
  }

  async function deletePermanently(sub) {
    if (!confirm(`¿Eliminar definitivamente el registro de ${sub.client_name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Topbar title="Clientes cancelados" />
      {error && <p className="text-red-400 text-sm mb-4 -mt-4">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Servicio</th>
              <th>Cuenta / perfil usado</th>
              <th>Fecha de cancelación</th>
              <th>Motivo</th>
              <th>Último pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.client_name}</td>
                <td className="text-gray-400">{s.client_phone || "—"}</td>
                <td>{s.service_name}</td>
                <td className="text-gray-400">{s.account_email || "—"}{s.profile_name ? ` · ${s.profile_name}` : ""}</td>
                <td className="text-gray-400">{s.cancelled_at ? new Date(s.cancelled_at).toLocaleDateString() : "—"}</td>
                <td className="text-gray-400">{s.cancellation_reason || "—"}</td>
                <td className="text-gray-400">{s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString() : "—"}</td>
                <td className="text-right whitespace-nowrap space-x-3">
                  <button className="text-xs text-accent-light hover:underline" onClick={() => reactivate(s)}>
                    Reactivar
                  </button>
                  <button className="text-xs text-red-400 hover:underline" onClick={() => deletePermanently(s)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && subs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-6">
                  No hay clientes cancelados por ahora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
