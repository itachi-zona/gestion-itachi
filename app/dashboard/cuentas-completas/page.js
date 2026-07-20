"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function addMonthISO(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function statusInfo(r) {
  if (r.status === "cancelada") return { label: "Cancelada", cls: "badge-neutral" };
  const days = Number(r.days_left);
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, cls: "badge-bad" };
  if (days === 0) return { label: "Vence hoy", cls: "badge-warn" };
  if (days <= 3) return { label: `Vence en ${days} día${days === 1 ? "" : "s"}`, cls: "badge-warn" };
  return { label: `${days} días restantes`, cls: "badge-good" };
}

function providerStatusInfo(r) {
  if (!r.provider_next_payment_date) return { label: "Sin fecha de pago al proveedor", cls: "badge-neutral" };
  const days = Number(r.provider_days_left);
  if (days < 0) return { label: `Debías pagar hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, cls: "badge-bad" };
  if (days === 0) return { label: "Debes pagarle hoy", cls: "badge-warn" };
  if (days <= 3) return { label: `Pagarle en ${days} día${days === 1 ? "" : "s"}`, cls: "badge-warn" };
  return { label: `Pagarle en ${days} días`, cls: "badge-good" };
}

export default function CuentasCompletasPage() {
  const [rentals, setRentals] = useState([]);
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showPass, setShowPass] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [payForm, setPayForm] = useState(null);
  const [editEmail, setEditEmail] = useState(null);
  const [editPass, setEditPass] = useState(null);
  const [editDays, setEditDays] = useState(null);
  const [editProvider, setEditProvider] = useState(null);
  const [editClientContact, setEditClientContact] = useState(null);
  const [filter, setFilter] = useState("todos");

  const [newRental, setNewRental] = useState({
    service_id: "",
    email: "",
    password: "",
    client_name: "",
    client_phone: "",
    client_email: "",
    account_created_date: todayISO(),
    expiration_date: addMonthISO(todayISO()),
    extra_days: 0,
    amount: "",
    notes: "",
    provider_name: "",
    provider_amount: "",
    provider_last_payment_date: "",
    provider_next_payment_date: ""
  });

  async function load() {
    const [r, s] = await Promise.all([
      fetch("/api/rental-accounts").then((x) => x.json()),
      fetch("/api/services").then((x) => x.json())
    ]);
    setRentals(r);
    setServices(s);
  }

  async function loadDetail(id) {
    const d = await fetch(`/api/rental-accounts/${id}`).then((r) => r.json());
    setSelected(d);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      if (filter === "activa") return r.status !== "cancelada" && Number(r.days_left) >= 0;
      if (filter === "por_vencer") return r.status !== "cancelada" && Number(r.days_left) >= 0 && Number(r.days_left) <= 3;
      if (filter === "vencida") return r.status !== "cancelada" && Number(r.days_left) < 0;
      if (filter === "cancelada") return r.status === "cancelada";
      return true;
    });
  }, [rentals, filter]);

  const counts = useMemo(() => {
    const activa = rentals.filter((r) => r.status !== "cancelada" && Number(r.days_left) >= 0).length;
    const porVencer = rentals.filter((r) => r.status !== "cancelada" && Number(r.days_left) >= 0 && Number(r.days_left) <= 3).length;
    const vencida = rentals.filter((r) => r.status !== "cancelada" && Number(r.days_left) < 0).length;
    return { total: rentals.length, activa, porVencer, vencida };
  }, [rentals]);

  async function createRental(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/rental-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRental)
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo crear la cuenta.");
      return;
    }
    setNewRental({
      service_id: "",
      email: "",
      password: "",
      client_name: "",
      client_phone: "",
      client_email: "",
      account_created_date: todayISO(),
      expiration_date: addMonthISO(todayISO()),
      extra_days: 0,
      amount: "",
      notes: "",
      provider_name: "",
      provider_amount: "",
      provider_last_payment_date: "",
      provider_next_payment_date: ""
    });
    setShowNew(false);
    load();
  }

  async function deleteRental(id) {
    if (!confirm("¿Eliminar definitivamente esta cuenta completa en alquiler? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/rental-accounts/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    load();
  }

  async function saveEmail(id) {
    await fetch(`/api/rental-accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editEmail.value })
    });
    setEditEmail(null);
    load();
    if (selected?.id === id) loadDetail(id);
  }

  async function savePassword(id) {
    await fetch(`/api/rental-accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: editPass.value })
    });
    setEditPass(null);
    load();
    if (selected?.id === id) loadDetail(id);
  }

  async function saveExtraDays(id) {
    await fetch(`/api/rental-accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extra_days: Number(editDays.value) || 0 })
    });
    setEditDays(null);
    load();
    if (selected?.id === id) loadDetail(id);
  }

  async function saveClientContact(id) {
    await fetch(`/api/rental-accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: editClientContact.client_name, client_phone: editClientContact.client_phone, client_email: editClientContact.client_email })
    });
    setEditClientContact(null);
    load();
    if (selected?.id === id) loadDetail(id);
  }

  async function saveProvider(id) {
    await fetch(`/api/rental-accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_name: editProvider.provider_name,
        provider_amount: editProvider.provider_amount || null,
        provider_last_payment_date: editProvider.provider_last_payment_date || null,
        provider_next_payment_date: editProvider.provider_next_payment_date || null
      })
    });
    setEditProvider(null);
    load();
    if (selected?.id === id) loadDetail(id);
  }

  async function markProviderPaid(r) {
    const today = todayISO();
    await fetch(`/api/rental-accounts/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_last_payment_date: today, provider_next_payment_date: addMonthISO(today) })
    });
    load();
    if (selected?.id === r.id) loadDetail(r.id);
  }

  async function registerPayment(e) {
    e.preventDefault();
    await fetch(`/api/rental-accounts/${payForm.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_date: payForm.payment_date,
        amount: payForm.amount,
        new_expiration_date: payForm.renew ? payForm.new_expiration_date : undefined
      })
    });
    setPayForm(null);
    load();
    loadDetail(payForm.id);
  }

  async function deletePayment(rentalId, paymentId) {
    if (!confirm("¿Eliminar este pago del historial?")) return;
    await fetch(`/api/rental-accounts/${rentalId}/payments/${paymentId}`, { method: "DELETE" });
    loadDetail(rentalId);
  }

  return (
    <div>
      <Topbar title="Cuentas completas (alquiler)" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 -mt-2">
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent-light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total cuentas</p>
            <p className="text-xl font-bold">{counts.total}</p>
          </div>
        </div>
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-good/15 flex items-center justify-center text-green-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Activas</p>
            <p className="text-xl font-bold">{counts.activa}</p>
          </div>
        </div>
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-warn/15 flex items-center justify-center text-amber-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Por vencer (≤3 días)</p>
            <p className="text-xl font-bold">{counts.porVencer}</p>
          </div>
        </div>
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-bad/15 flex items-center justify-center text-red-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Vencidas</p>
            <p className="text-xl font-bold">{counts.vencida}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            ["todos", "Todos"],
            ["activa", "Activas"],
            ["por_vencer", "Por vencer"],
            ["vencida", "Vencidas"],
            ["cancelada", "Canceladas"]
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`tab-btn ${filter === v ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowNew(true)}>
          + Nueva cuenta completa
        </button>
      </div>

      {showNew && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Nueva cuenta completa en alquiler</h2>
          <form onSubmit={createRental} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Servicio (opcional)</label>
              <select className="input" value={newRental.service_id} onChange={(e) => setNewRental({ ...newRental, service_id: e.target.value })}>
                <option value="">Sin servicio específico</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cliente (opcional)</label>
              <input className="input" value={newRental.client_name} onChange={(e) => setNewRental({ ...newRental, client_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Teléfono del cliente</label>
              <input className="input" value={newRental.client_phone} onChange={(e) => setNewRental({ ...newRental, client_phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo del cliente</label>
              <input className="input" value={newRental.client_email} onChange={(e) => setNewRental({ ...newRental, client_email: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo de la cuenta</label>
              <input className="input" required value={newRental.email} onChange={(e) => setNewRental({ ...newRental, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" required value={newRental.password} onChange={(e) => setNewRental({ ...newRental, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de creación</label>
              <input
                type="date"
                className="input"
                value={newRental.account_created_date}
                onChange={(e) => setNewRental({ ...newRental, account_created_date: e.target.value, expiration_date: addMonthISO(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Fecha de caducación (1 mes por defecto)</label>
              <input type="date" className="input" value={newRental.expiration_date} onChange={(e) => setNewRental({ ...newRental, expiration_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Días adicionales (aparte de la caducación)</label>
              <input type="number" className="input" value={newRental.extra_days} onChange={(e) => setNewRental({ ...newRental, extra_days: e.target.value })} />
            </div>
            <div>
              <label className="label">Monto que paga el cliente (S/)</label>
              <input type="number" step="0.01" className="input" value={newRental.amount} onChange={(e) => setNewRental({ ...newRental, amount: e.target.value })} />
            </div>

            <div className="col-span-2 border-t border-border pt-4 mt-1">
              <p className="section-title text-sm mb-3">Proveedor (a quién le compras/pagas esta cuenta)</p>
            </div>
            <div>
              <label className="label">Nombre del proveedor</label>
              <input className="input" value={newRental.provider_name} onChange={(e) => setNewRental({ ...newRental, provider_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Monto que le pagas (S/)</label>
              <input type="number" step="0.01" className="input" value={newRental.provider_amount} onChange={(e) => setNewRental({ ...newRental, provider_amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha en que le pagaste</label>
              <input
                type="date"
                className="input"
                value={newRental.provider_last_payment_date}
                onChange={(e) =>
                  setNewRental({
                    ...newRental,
                    provider_last_payment_date: e.target.value,
                    provider_next_payment_date: newRental.provider_next_payment_date || addMonthISO(e.target.value)
                  })
                }
              />
            </div>
            <div>
              <label className="label">Fecha en que le debes pagar</label>
              <input type="date" className="input" value={newRental.provider_next_payment_date} onChange={(e) => setNewRental({ ...newRental, provider_next_payment_date: e.target.value })} />
            </div>

            <div className="col-span-2">
              <label className="label">Notas</label>
              <input className="input" value={newRental.notes} onChange={(e) => setNewRental({ ...newRental, notes: e.target.value })} />
            </div>
            {error && <p className="text-red-400 text-sm col-span-2">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button className="btn-primary">Guardar cuenta</button>
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-x-auto">
          <h2 className="section-title mb-4">Cuentas completas ({filtered.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Contraseña</th>
                <th>Creación</th>
                <th>Caducación</th>
                <th>Días extra</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Proveedor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = statusInfo(r);
                return (
                  <tr key={r.id} className={selected?.id === r.id ? "bg-panel2/60 cursor-pointer" : "cursor-pointer"} onClick={() => loadDetail(r.id)}>
                    <td>
                      <p className="font-medium">{r.email}</p>
                      {r.client_name && <p className="text-xs text-gray-500">{r.client_name}</p>}
                    </td>
                    <td>
                      <span className="font-mono">{showPass[r.id] ? r.password : "••••••••"}</span>{" "}
                      <button
                        className="text-xs text-accent-light"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPass({ ...showPass, [r.id]: !showPass[r.id] });
                        }}
                      >
                        {showPass[r.id] ? "ocultar" : "ver"}
                      </button>
                    </td>
                    <td>{r.account_created_date ? new Date(r.account_created_date).toLocaleDateString() : "—"}</td>
                    <td>{r.expiration_date ? new Date(r.expiration_date).toLocaleDateString() : "—"}</td>
                    <td>{r.extra_days > 0 ? `+${r.extra_days}d` : "—"}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td>{r.amount ? `S/${Number(r.amount).toFixed(2)}` : "—"}</td>
                    <td>
                      {r.provider_name ? (
                        <>
                          <p className="text-xs">{r.provider_name}</p>
                          <span className={`badge ${providerStatusInfo(r).cls}`}>{providerStatusInfo(r).label}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        className="text-red-400 text-xs hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRental(r.id);
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-6">
                    No hay cuentas completas registradas en esta vista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <h2 className="section-title mb-4">Detalle de cuenta</h2>
          {!selected ? (
            <p className="text-gray-400 text-sm">Selecciona una cuenta de la lista para ver y editar sus detalles.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <span className={`badge ${statusInfo(selected).cls}`}>{statusInfo(selected).label}</span>
              </div>

              {/* Cliente editable */}
              <div>
                <label className="label">Cliente</label>
                {editClientContact?.id === selected.id ? (
                  <div className="space-y-2">
                    <input className="input" placeholder="Nombre" value={editClientContact.client_name} onChange={(e) => setEditClientContact({ ...editClientContact, client_name: e.target.value })} />
                    <input className="input" placeholder="Teléfono" value={editClientContact.client_phone} onChange={(e) => setEditClientContact({ ...editClientContact, client_phone: e.target.value })} />
                    <input className="input" placeholder="Correo" value={editClientContact.client_email} onChange={(e) => setEditClientContact({ ...editClientContact, client_email: e.target.value })} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs" onClick={() => saveClientContact(selected.id)}>Guardar</button>
                      <button className="btn-secondary text-xs" onClick={() => setEditClientContact(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p>{selected.client_name || "Sin nombre asignado"}</p>
                      <p className="text-xs text-gray-500">{selected.client_phone || "—"} {selected.client_email && `· ${selected.client_email}`}</p>
                    </div>
                    <button
                      className="text-xs text-accent-light hover:underline"
                      onClick={() =>
                        setEditClientContact({
                          id: selected.id,
                          client_name: selected.client_name || "",
                          client_phone: selected.client_phone || "",
                          client_email: selected.client_email || ""
                        })
                      }
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>

              {/* Correo editable */}
              <div>
                <label className="label">Correo de la cuenta</label>
                {editEmail?.id === selected.id ? (
                  <div className="flex gap-2">
                    <input className="input" value={editEmail.value} onChange={(e) => setEditEmail({ id: selected.id, value: e.target.value })} />
                    <button className="btn-primary text-xs" onClick={() => saveEmail(selected.id)}>Guardar</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditEmail(null)}>X</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{selected.email}</p>
                    <button className="text-xs text-accent-light hover:underline" onClick={() => setEditEmail({ id: selected.id, value: selected.email })}>
                      Cambiar correo
                    </button>
                  </div>
                )}
              </div>

              {/* Contraseña editable */}
              <div>
                <label className="label">Contraseña</label>
                {editPass?.id === selected.id ? (
                  <div className="flex gap-2">
                    <input className="input" value={editPass.value} onChange={(e) => setEditPass({ id: selected.id, value: e.target.value })} />
                    <button className="btn-primary text-xs" onClick={() => savePassword(selected.id)}>Guardar</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditPass(null)}>X</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono">{showPass[selected.id] ? selected.password : "••••••••"}</p>
                    <div className="flex gap-3">
                      <button className="text-xs text-gray-400 hover:underline" onClick={() => setShowPass({ ...showPass, [selected.id]: !showPass[selected.id] })}>
                        {showPass[selected.id] ? "ocultar" : "ver"}
                      </button>
                      <button className="text-xs text-accent-light hover:underline" onClick={() => setEditPass({ id: selected.id, value: selected.password })}>
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="label mb-0.5">Creación</p>
                  <p>{selected.account_created_date ? new Date(selected.account_created_date).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="label mb-0.5">Caducación</p>
                  <p>{selected.expiration_date ? new Date(selected.expiration_date).toLocaleDateString() : "—"}</p>
                </div>
              </div>

              {/* Días adicionales editable */}
              <div>
                <label className="label">Días adicionales (gracia aparte de la caducación)</label>
                {editDays?.id === selected.id ? (
                  <div className="flex gap-2">
                    <input type="number" className="input" value={editDays.value} onChange={(e) => setEditDays({ id: selected.id, value: e.target.value })} />
                    <button className="btn-primary text-xs" onClick={() => saveExtraDays(selected.id)}>Guardar</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditDays(null)}>X</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{selected.extra_days > 0 ? `+${selected.extra_days} día(s) extra` : "Sin días extra"}</p>
                    <button className="text-xs text-accent-light hover:underline" onClick={() => setEditDays({ id: selected.id, value: selected.extra_days || 0 })}>
                      Ajustar
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Vence definitivamente el {new Date(selected.final_expiration_date).toLocaleDateString()} ({selected.days_left} día{Math.abs(Number(selected.days_left)) === 1 ? "" : "s"} restantes)
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="label mb-0">Proveedor (a quién le pagas por esta cuenta)</p>
                  <span className={`badge ${providerStatusInfo(selected).cls}`}>{providerStatusInfo(selected).label}</span>
                </div>
                {editProvider?.id === selected.id ? (
                  <div className="space-y-2">
                    <input className="input" placeholder="Nombre del proveedor" value={editProvider.provider_name} onChange={(e) => setEditProvider({ ...editProvider, provider_name: e.target.value })} />
                    <input type="number" step="0.01" className="input" placeholder="Monto que le pagas (S/)" value={editProvider.provider_amount} onChange={(e) => setEditProvider({ ...editProvider, provider_amount: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Le pagaste el</label>
                        <input type="date" className="input" value={editProvider.provider_last_payment_date} onChange={(e) => setEditProvider({ ...editProvider, provider_last_payment_date: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Debes pagarle el</label>
                        <input type="date" className="input" value={editProvider.provider_next_payment_date} onChange={(e) => setEditProvider({ ...editProvider, provider_next_payment_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs" onClick={() => saveProvider(selected.id)}>Guardar</button>
                      <button className="btn-secondary text-xs" onClick={() => setEditProvider(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p>{selected.provider_name || "Sin proveedor asignado"}{selected.provider_amount ? ` · S/${Number(selected.provider_amount).toFixed(2)}` : ""}</p>
                    <p className="text-xs text-gray-500">
                      Le pagaste: {selected.provider_last_payment_date ? new Date(selected.provider_last_payment_date).toLocaleDateString() : "—"}
                      {" · "}
                      Debes pagarle: {selected.provider_next_payment_date ? new Date(selected.provider_next_payment_date).toLocaleDateString() : "—"}
                    </p>
                    <div className="flex gap-3 pt-1">
                      <button
                        className="text-xs text-accent-light hover:underline"
                        onClick={() =>
                          setEditProvider({
                            id: selected.id,
                            provider_name: selected.provider_name || "",
                            provider_amount: selected.provider_amount || "",
                            provider_last_payment_date: selected.provider_last_payment_date || "",
                            provider_next_payment_date: selected.provider_next_payment_date || ""
                          })
                        }
                      >
                        Editar
                      </button>
                      <button className="text-xs text-green-400 hover:underline" onClick={() => markProviderPaid(selected)}>
                        Marcar como pagado hoy (+1 mes)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="label mb-0">Pagos del cliente ({selected.payments?.length || 0})</p>
                  <button
                    className="text-xs text-accent-light hover:underline"
                    onClick={() =>
                      setPayForm({
                        id: selected.id,
                        payment_date: todayISO(),
                        amount: selected.amount || "",
                        renew: true,
                        new_expiration_date: addMonthISO(selected.expiration_date)
                      })
                    }
                  >
                    + Registrar pago
                  </button>
                </div>
                {selected.last_payment_date && (
                  <p className="text-xs text-gray-400 mb-2">
                    Último pago: {new Date(selected.last_payment_date).toLocaleDateString()} · S/{selected.amount ? Number(selected.amount).toFixed(2) : "—"}
                  </p>
                )}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selected.payments?.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs border border-border rounded-lg px-2 py-1.5">
                      <span>{new Date(p.payment_date).toLocaleDateString()} · S/{p.amount ? Number(p.amount).toFixed(2) : "—"}</span>
                      <button className="text-red-400 hover:underline" onClick={() => deletePayment(selected.id, p.id)}>Eliminar</button>
                    </div>
                  ))}
                  {(!selected.payments || selected.payments.length === 0) && (
                    <p className="text-xs text-gray-500">Sin pagos registrados aún.</p>
                  )}
                </div>
              </div>

              <button className="btn-danger w-full text-sm" onClick={() => deleteRental(selected.id)}>
                Eliminar esta cuenta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: registrar pago */}
      {payForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="section-title mb-4">Registrar pago</h2>
            <form onSubmit={registerPayment} className="space-y-4">
              <div>
                <label className="label">Fecha de pago</label>
                <input type="date" className="input" required value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Monto pagado (S/)</label>
                <input type="number" step="0.01" className="input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={payForm.renew} onChange={(e) => setPayForm({ ...payForm, renew: e.target.checked })} />
                <label className="text-sm text-gray-300">Renovar y mover la fecha de caducación</label>
              </div>
              {payForm.renew && (
                <div>
                  <label className="label">Nueva fecha de caducación</label>
                  <input type="date" className="input" value={payForm.new_expiration_date} onChange={(e) => setPayForm({ ...payForm, new_expiration_date: e.target.value })} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button className="btn-primary">Guardar pago</button>
                <button type="button" className="btn-secondary" onClick={() => setPayForm(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
