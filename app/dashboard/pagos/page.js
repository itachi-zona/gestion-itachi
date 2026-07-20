"use client";
import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";

const METHODS = ["Yape", "Plin", "Transferencia", "Efectivo", "Otro"];

function statusBadge(status) {
  const map = {
    pagado: "badge-good",
    pago_parcial: "badge-warn",
    pendiente: "badge-warn",
    vencido: "badge-bad",
    anulado: "badge-neutral",
    devuelto: "badge-neutral"
  };
  return <span className={`badge ${map[status] || "badge-neutral"}`}>{status}</span>;
}

function Boleta({ payment, businessName }) {
  return (
    <div id="boleta-capture" className="bg-[#0d0d16] border border-border rounded-2xl p-6 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold">✓</span>
        <div>
          <p className="font-display font-bold text-white leading-tight">{businessName || "Streaming Manager"}</p>
          <p className="text-xs text-gray-400">Boleta de pago</p>
        </div>
      </div>
      <div className="space-y-2 text-sm border-t border-border pt-4">
        <Row label="Fecha de pago" value={new Date(payment.payment_date).toLocaleDateString()} />
        <Row label="Cliente" value={payment.client_name} />
        <Row label="Servicio" value={payment.service_name} />
        <Row label="Monto" value={payment.amount ? `S/ ${Number(payment.amount).toFixed(2)}` : "—"} />
        <Row label="Método" value={payment.method || "—"} />
        <Row label="Próximo pago" value={payment.next_payment_date ? new Date(payment.next_payment_date).toLocaleDateString() : "—"} />
        <Row label="Correo de la cuenta" value={payment.account_email || "—"} />
        {payment.sub_type === "perfil" && <Row label="PIN de perfil" value={payment.profile_pin || "—"} />}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-good text-sm font-semibold">
        <span>✓</span> Pago confirmado
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export default function PagosPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boletaPayment, setBoletaPayment] = useState(null);
  const [businessName, setBusinessName] = useState("Streaming Manager");
  const [editMethod, setEditMethod] = useState(null); // { id, method }

  async function load() {
    setLoading(true);
    const rows = await fetch("/api/payments").then((r) => r.json());
    setPayments(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/settings").then((r) => r.json()).then((s) => s?.business_name && setBusinessName(s.business_name));
  }, []);

  async function deletePayment(p) {
    if (!confirm(`¿Eliminar este pago de ${p.client_name} (S/ ${Number(p.amount || 0).toFixed(2)})? Útil si se registró dos veces por error.`)) return;
    await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    load();
  }

  async function saveMethod() {
    await fetch(`/api/payments/${editMethod.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: editMethod.method })
    });
    setEditMethod(null);
    load();
  }

  async function downloadBoleta() {
    const el = document.getElementById("boleta-capture");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { backgroundColor: "#0d0d16", scale: 2 });
    const link = document.createElement("a");
    link.download = `boleta-${boletaPayment.client_name}-${boletaPayment.payment_date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function shareWhatsApp() {
    const phone = (boletaPayment.client_phone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${boletaPayment.client_name}, aquí tu boleta de pago de ${boletaPayment.service_name} por S/ ${Number(boletaPayment.amount || 0).toFixed(2)}. ¡Gracias por tu pago! Tu próximo pago es el ${boletaPayment.next_payment_date ? new Date(boletaPayment.next_payment_date).toLocaleDateString() : "-"}.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  return (
    <div>
      <Topbar title="Historial de pagos" />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha de pago</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Próximo pago</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td className="font-medium">{p.client_name}</td>
                <td>{p.service_name}</td>
                <td>{p.amount ? `S/ ${Number(p.amount).toFixed(2)}` : "—"}</td>
                <td>
                  <button
                    className="text-xs text-accent-light hover:underline"
                    onClick={() => setEditMethod({ id: p.id, method: p.method || "Yape" })}
                  >
                    {p.method || "Asignar"}
                  </button>
                </td>
                <td className="text-gray-400">
                  {p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString() : "—"}
                  {p.sub_status === "cancelado" && <span className="text-xs text-gray-500 ml-1">(cancelado)</span>}
                </td>
                <td>{statusBadge(p.status)}</td>
                <td className="text-right whitespace-nowrap space-x-3">
                  <button className="text-xs text-accent-light hover:underline" onClick={() => setBoletaPayment(p)}>
                    Boleta de pago
                  </button>
                  <button className="text-xs text-red-400 hover:underline" onClick={() => deletePayment(p)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-6">
                  Aún no hay pagos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: cambiar método de pago */}
      {editMethod && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-xs">
            <h2 className="font-semibold mb-4">Método de pago</h2>
            <select className="input mb-4" value={editMethod.method} onChange={(e) => setEditMethod({ ...editMethod, method: e.target.value })}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={saveMethod}>Guardar</button>
              <button className="btn-secondary" onClick={() => setEditMethod(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: boleta de pago */}
      {boletaPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <Boleta payment={boletaPayment} businessName={businessName} />
            <div className="flex gap-3 mt-4 max-w-sm mx-auto">
              <button className="btn-primary flex-1" onClick={downloadBoleta}>Descargar imagen</button>
              <button className="btn-secondary flex-1" onClick={shareWhatsApp}>Enviar WhatsApp</button>
            </div>
            <button className="text-xs text-gray-400 hover:underline block mx-auto mt-3" onClick={() => setBoletaPayment(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
