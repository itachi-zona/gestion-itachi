"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function statusBadge(sub) {
  if (sub.status === "cancelado") return <span className="badge badge-neutral">Cancelado</span>;
  const days = Number(sub.days_left);
  if (days < 0) return <span className="badge badge-bad">Vencido</span>;
  if (days <= 3) return <span className="badge badge-warn">Por vencer</span>;
  return <span className="badge badge-good">Activo</span>;
}

function typeBadge(type) {
  return type === "perfil" ? (
    <span className="badge badge-info">Por perfil</span>
  ) : (
    <span className="badge badge-pink">Cuenta completa</span>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", notes: "" });
  const [subForm, setSubForm] = useState(null); // { client_id }
  const [renewForm, setRenewForm] = useState(null); // { subscription_id }
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos"); // todos | perfil | cuenta_completa

  async function loadAll() {
    const [c, s, a] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json())
    ]);
    setClients(c);
    setServices(s);
    setAccounts(a);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createClient(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient)
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo crear el cliente.");
      return;
    }
    setNewClient({ name: "", phone: "", email: "", notes: "" });
    setShowNewClient(false);
    loadAll();
  }

  async function deleteClient(id) {
    if (!confirm("¿Eliminar este cliente y todas sus suscripciones?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function cancelSub(id) {
    if (!confirm("¿Cancelar esta suscripción? El perfil quedará libre para otro cliente.")) return;
    const reason = prompt("Motivo de la cancelación (opcional):", "Ya no desea el servicio");
    await fetch(`/api/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: reason || null })
    });
    loadAll();
  }

  async function renewSub(e) {
    e.preventDefault();
    await fetch(`/api/subscriptions/${renewForm.subscription_id}`, {
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
    loadAll();
  }

  async function createSubscription(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subForm)
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo crear la suscripción.");
      return;
    }
    setSubForm(null);
    loadAll();
  }

  const accountsForService = (serviceId) => accounts.filter((a) => String(a.service_id) === String(serviceId));

  const counts = useMemo(() => {
    let perfil = 0;
    let completa = 0;
    for (const c of clients) {
      for (const s of c.subscriptions || []) {
        if (s.status === "cancelado") continue;
        if (s.type === "perfil") perfil++;
        else completa++;
      }
    }
    return { perfil, completa, clientes: clients.length };
  }, [clients]);

  const visibleClients = useMemo(() => {
    if (typeFilter === "todos") return clients.map((c) => ({ ...c, subscriptions: c.subscriptions }));
    return clients
      .map((c) => ({ ...c, subscriptions: (c.subscriptions || []).filter((s) => s.type === typeFilter) }))
      .filter((c) => c.subscriptions.length > 0);
  }, [clients, typeFilter]);

  return (
    <div>
      <Topbar title="Clientes y renovaciones" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 -mt-2">
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent-light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Clientes</p>
            <p className="text-xl font-bold">{counts.clientes}</p>
          </div>
        </div>
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent-light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h1M14 9h1M9 14h1M14 14h1"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Suscripciones por perfil</p>
            <p className="text-xl font-bold">{counts.perfil}</p>
          </div>
        </div>
        <div className="card-stat">
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Cuentas completas alquiladas</p>
            <p className="text-xl font-bold">{counts.completa}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            ["todos", "Todos"],
            ["perfil", "Por perfil"],
            ["cuenta_completa", "Cuenta completa"]
          ].map(([v, label]) => (
            <button key={v} onClick={() => setTypeFilter(v)} className={`tab-btn ${typeFilter === v ? "tab-btn-active" : "tab-btn-inactive"}`}>
              {label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowNewClient(true)}>
          + Nuevo cliente
        </button>
      </div>

      {showNewClient && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Nuevo cliente</h2>
          <form onSubmit={createClient} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Teléfono / WhatsApp</label>
              <input className="input" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" value={newClient.notes} onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} />
            </div>
            {error && <p className="text-red-400 text-sm col-span-2">{error}</p>}
            <div className="col-span-2 flex gap-3">
              <button className="btn-primary">Guardar cliente</button>
              <button type="button" className="btn-secondary" onClick={() => setShowNewClient(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {visibleClients.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{c.name}</p>
                <p className="text-gray-400 text-sm">{c.phone} {c.email && `· ${c.email}`}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  {expanded === c.id ? "Ocultar" : "Ver suscripciones"} ({c.subscriptions.length})
                </button>
                <button
                  className="btn-primary text-sm"
                  onClick={() => setSubForm({ client_id: c.id, service_id: "", account_id: "", profile_id: "", type: "perfil", join_date: new Date().toISOString().slice(0, 10), last_payment_date: "", next_payment_date: "", price: "", has_guarantee: false, guarantee_days: 0 })}
                >
                  + Suscripción
                </button>
                <button className="btn-danger text-sm" onClick={() => deleteClient(c.id)}>
                  Eliminar
                </button>
              </div>
            </div>

            {expanded === c.id && (
              <div className="mt-4 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Tipo</th>
                      <th>Garantía</th>
                      <th>Último pago</th>
                      <th>Próximo pago</th>
                      <th>Días restantes</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>
                          {s.service_name}
                          {s.profile_name && <span className="text-gray-500"> · {s.profile_name} (PIN {s.pin || "—"})</span>}
                          <div className="text-xs text-gray-500">{s.account_email}</div>
                        </td>
                        <td>{typeBadge(s.type)}</td>
                        <td>
                          {s.has_guarantee ? (
                            <span className="badge badge-good">{s.guarantee_days} días</span>
                          ) : (
                            <span className="badge badge-neutral">No</span>
                          )}
                        </td>
                        <td>{s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString() : "—"}</td>
                        <td>{s.next_payment_date ? new Date(s.next_payment_date).toLocaleDateString() : "—"}</td>
                        <td>{Number(s.days_left) >= 0 ? `${s.days_left} días` : `Vencido hace ${Math.abs(s.days_left)} días`}</td>
                        <td>{statusBadge(s)}</td>
                        <td className="text-right space-x-2 whitespace-nowrap">
                          {s.status !== "cancelado" && (
                            <>
                              <button
                                className="text-accent-light text-xs hover:underline"
                                onClick={() =>
                                  setRenewForm({
                                    subscription_id: s.id,
                                    payment_date: new Date().toISOString().slice(0, 10),
                                    next_payment_date: "",
                                    amount: s.price || "",
                                    method: "Yape"
                                  })
                                }
                              >
                                Renovar
                              </button>
                              <button className="text-red-400 text-xs hover:underline" onClick={() => cancelSub(s.id)}>
                                Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {c.subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 py-4">
                          Este cliente no tiene suscripciones aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {clients.length === 0 && <p className="text-gray-400">Aún no hay clientes registrados.</p>}
        {clients.length > 0 && visibleClients.length === 0 && (
          <p className="text-gray-400">Ningún cliente tiene suscripciones de este tipo todavía.</p>
        )}
      </div>

      {/* Modal: nueva suscripción */}
      {subForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold mb-4">Nueva suscripción</h2>
            <form onSubmit={createSubscription} className="space-y-4">
              <div>
                <label className="label">Servicio</label>
                <select
                  className="input"
                  required
                  value={subForm.service_id}
                  onChange={(e) => setSubForm({ ...subForm, service_id: e.target.value, account_id: "", profile_id: "" })}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {subForm.service_id && (
                <div>
                  <label className="label">Cuenta</label>
                  <select
                    className="input"
                    required
                    value={subForm.account_id}
                    onChange={(e) => setSubForm({ ...subForm, account_id: e.target.value, profile_id: "" })}
                  >
                    <option value="">Selecciona una cuenta</option>
                    {accountsForService(subForm.service_id).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.email} ({a.free_profiles} perfiles libres)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Tipo de venta</label>
                <select
                  className="input"
                  value={subForm.type}
                  onChange={(e) => setSubForm({ ...subForm, type: e.target.value, profile_id: "" })}
                >
                  <option value="perfil">Perfil compartido</option>
                  <option value="cuenta_completa">Cuenta completa</option>
                </select>
              </div>

              {subForm.type === "perfil" && subForm.account_id && (
                <ProfileSelect accountId={subForm.account_id} value={subForm.profile_id} onChange={(v) => setSubForm({ ...subForm, profile_id: v })} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha de ingreso</label>
                  <input type="date" className="input" required value={subForm.join_date} onChange={(e) => setSubForm({ ...subForm, join_date: e.target.value, last_payment_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Próximo pago</label>
                  <input type="date" className="input" required value={subForm.next_payment_date} onChange={(e) => setSubForm({ ...subForm, next_payment_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Precio (S/)</label>
                  <input type="number" step="0.01" className="input" value={subForm.price} onChange={(e) => setSubForm({ ...subForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="label">Días de garantía (0 = sin garantía)</label>
                  <input
                    type="number"
                    className="input"
                    value={subForm.guarantee_days}
                    onChange={(e) =>
                      setSubForm({ ...subForm, guarantee_days: Number(e.target.value), has_guarantee: Number(e.target.value) > 0 })
                    }
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button className="btn-primary">Guardar suscripción</button>
                <button type="button" className="btn-secondary" onClick={() => setSubForm(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: renovar pago */}
      {renewForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-4">Registrar renovación / pago</h2>
            <form onSubmit={renewSub} className="space-y-4">
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

function ProfileSelect({ accountId, value, onChange }) {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles?.filter((p) => p.status === "libre") || []));
  }, [accountId]);

  return (
    <div>
      <label className="label">Perfil disponible</label>
      <select className="input" required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona un perfil libre</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.profile_name} (PIN {p.pin || "sin asignar"})
          </option>
        ))}
      </select>
      {profiles.length === 0 && <p className="text-xs text-amber-400 mt-1">Esta cuenta no tiene perfiles libres.</p>}
    </div>
  );
}
