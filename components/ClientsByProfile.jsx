"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  return new Date(`${raw}T00:00:00`).toLocaleDateString("es-PE");
}

function initials(name) {
  return String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function statusMeta(subscription) {
  if (subscription.status === "cancelado") return { label: "Cancelado", className: "badge-neutral" };
  const days = Number(subscription.days_left);
  if (days < 0) return { label: "Vencido", className: "badge-bad" };
  if (days <= 3) return { label: days === 0 ? "Vence hoy" : `Vence en ${days} d.`, className: "badge-warn" };
  return { label: "Activo", className: "badge-good" };
}

function nextPaymentLabel(subscriptions) {
  const valid = subscriptions
    .filter((sub) => sub.status !== "cancelado" && sub.next_payment_date)
    .sort((a, b) => String(a.next_payment_date).localeCompare(String(b.next_payment_date)));
  return valid[0] ? formatDate(valid[0].next_payment_date) : "Sin fecha";
}

function subscriptionStatusMatches(sub, filter) {
  const days = Number(sub.days_left);
  if (filter === "activo") return sub.status !== "cancelado" && days > 3;
  if (filter === "por_vencer") return sub.status !== "cancelado" && days >= 0 && days <= 3;
  if (filter === "vencido") return sub.status !== "cancelado" && days < 0;
  if (filter === "cancelado") return sub.status === "cancelado";
  return true;
}

export default function ClientsByProfile() {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", notes: "" });
  const [subForm, setSubForm] = useState(null);
  const [renewForm, setRenewForm] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [clientsResponse, servicesResponse, accountsResponse] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/services"),
        fetch("/api/accounts")
      ]);

      const [clientsData, servicesData, accountsData] = await Promise.all([
        clientsResponse.json(),
        servicesResponse.json(),
        accountsResponse.json()
      ]);

      setClients(Array.isArray(clientsData) ? clientsData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function blankSubscription(clientId) {
    return {
      client_id: clientId,
      service_id: "",
      account_id: "",
      profile_id: "",
      type: "perfil",
      join_date: todayISO(),
      last_payment_date: todayISO(),
      next_payment_date: "",
      price: "",
      has_guarantee: false,
      guarantee_days: 0
    };
  }

  async function createClient(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient)
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear el cliente.");
      return;
    }

    setNewClient({ name: "", phone: "", email: "", notes: "" });
    setShowNewClient(false);
    setSubForm(blankSubscription(data.id));
    await loadAll();
  }

  async function createSubscription(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...subForm, type: "perfil" })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo asignar el perfil.");
      return;
    }

    setSubForm(null);
    await loadAll();
  }

  async function renewSubscription(event) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/subscriptions/${renewForm.subscription_id}`, {
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

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "No se pudo registrar la renovación.");
      return;
    }

    setRenewForm(null);
    await loadAll();
  }

  async function cancelSubscription(id) {
    if (!confirm("¿Cancelar esta suscripción? El perfil quedará libre para otro cliente.")) return;
    const reason = prompt("Motivo de la cancelación (opcional):", "Ya no desea el servicio");

    await fetch(`/api/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: reason || null })
    });
    await loadAll();
  }

  async function deleteClient(id) {
    if (!confirm("¿Eliminar este cliente y todas sus suscripciones? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (expanded === id) setExpanded(null);
    await loadAll();
  }

  const profileClients = useMemo(() => {
    return clients
      .map((client) => {
        const allSubscriptions = client.subscriptions || [];
        const profileSubscriptions = allSubscriptions.filter((subscription) => subscription.type === "perfil");
        return { ...client, allSubscriptions, subscriptions: profileSubscriptions };
      })
      .filter((client) => client.subscriptions.length > 0 || client.allSubscriptions.length === 0);
  }, [clients]);

  const counts = useMemo(() => {
    const subscriptions = profileClients.flatMap((client) => client.subscriptions);
    return {
      clients: profileClients.filter((client) => client.subscriptions.length > 0).length,
      active: subscriptions.filter((sub) => sub.status !== "cancelado" && Number(sub.days_left) >= 0).length,
      expiring: subscriptions.filter((sub) => sub.status !== "cancelado" && Number(sub.days_left) >= 0 && Number(sub.days_left) <= 3).length,
      expired: subscriptions.filter((sub) => sub.status !== "cancelado" && Number(sub.days_left) < 0).length
    };
  }, [profileClients]);

  const visibleClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return profileClients
      .map((client) => {
        let subscriptions = [...client.subscriptions];
        if (serviceFilter) {
          subscriptions = subscriptions.filter((sub) => String(sub.service_id) === String(serviceFilter));
        }
        if (statusFilter !== "todos" && statusFilter !== "sin_asignar") {
          subscriptions = subscriptions.filter((sub) => subscriptionStatusMatches(sub, statusFilter));
        }
        return { ...client, subscriptions };
      })
      .filter((client) => {
        if (statusFilter === "sin_asignar" && client.allSubscriptions.length !== 0) return false;
        if (serviceFilter && client.subscriptions.length === 0) return false;
        if (statusFilter !== "sin_asignar" && statusFilter !== "todos" && client.subscriptions.length === 0) return false;

        if (!normalizedSearch) return true;
        const haystack = [
          client.name,
          client.phone,
          client.email,
          ...client.subscriptions.flatMap((sub) => [sub.service_name, sub.profile_name, sub.account_email])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [profileClients, search, serviceFilter, statusFilter]);

  const accountsForSelectedService = useMemo(() => {
    if (!subForm?.service_id) return [];
    return accounts.filter((account) => String(account.service_id) === String(subForm.service_id));
  }, [accounts, subForm?.service_id]);

  return (
    <div>
      <Topbar
        eyebrow="Clientes"
        title="Clientes por perfil"
        subtitle="Administra clientes que usan un perfil dentro de una cuenta compartida, sus pagos, garantías y renovaciones."
      />

      <section className="hero-panel mb-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="badge badge-info mb-3">Gestión separada</span>
            <h2 className="text-xl font-semibold text-white">Perfiles compartidos, sin mezclarlos con cuentas completas</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Cada cliente puede tener uno o varios perfiles, con control de PIN, fecha de pago, precio y estado.
            </p>
          </div>
          <button className="btn-primary shrink-0" onClick={() => { setError(""); setShowNewClient(true); }}>
            <span className="text-lg leading-none">+</span> Nuevo cliente por perfil
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        <StatCard label="Clientes con perfil" value={counts.clients} tone="accent" />
        <StatCard label="Perfiles activos" value={counts.active} tone="good" />
        <StatCard label="Por vencer" value={counts.expiring} tone="warn" />
        <StatCard label="Vencidos" value={counts.expired} tone="bad" />
      </div>

      <div className="toolbar mb-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="input pl-10"
              placeholder="Buscar cliente, teléfono, perfil o cuenta..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="input sm:max-w-[230px]" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            <option value="">Todos los servicios</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 shrink-0">{visibleClients.length} resultado(s)</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["todos", "Todos"],
          ["activo", "Activos"],
          ["por_vencer", "Por vencer"],
          ["vencido", "Vencidos"],
          ["cancelado", "Cancelados"],
          ["sin_asignar", "Sin perfil asignado"]
        ].map(([value, label]) => (
          <button
            key={value}
            className={`tab-btn ${statusFilter === value ? "tab-btn-active" : "tab-btn-inactive"}`}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : visibleClients.length === 0 ? (
        <div className="empty-state">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" /></svg>
          </div>
          <h3 className="font-semibold text-gray-200">No hay clientes que coincidan</h3>
          <p className="mt-1 text-sm text-gray-500">Cambia los filtros o registra un nuevo cliente por perfil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleClients.map((client) => {
            const activeCount = client.subscriptions.filter((sub) => sub.status !== "cancelado" && Number(sub.days_left) >= 0).length;
            const serviceNames = [...new Set(client.subscriptions.map((sub) => sub.service_name).filter(Boolean))];
            const isExpanded = expanded === client.id;

            return (
              <article key={client.id} className="client-card">
                <div className="client-card-header">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="avatar-ring">{initials(client.name)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-white">{client.name}</h3>
                        {client.subscriptions.length === 0 && <span className="badge badge-neutral">Sin perfil</span>}
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {client.phone || "Sin teléfono"}{client.email ? ` · ${client.email}` : ""}
                      </p>
                      {serviceNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {serviceNames.slice(0, 3).map((name) => <span key={name} className="badge badge-info">{name}</span>)}
                          {serviceNames.length > 3 && <span className="badge badge-neutral">+{serviceNames.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <div className="metric-chip min-w-[105px]">
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">Activos</p>
                        <p className="mt-0.5 font-semibold text-gray-200">{activeCount}</p>
                      </div>
                      <div className="metric-chip min-w-[125px]">
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">Próximo pago</p>
                        <p className="mt-0.5 font-semibold text-gray-200">{nextPaymentLabel(client.subscriptions)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => setExpanded(isExpanded ? null : client.id)}>
                        {isExpanded ? "Ocultar" : `Ver perfiles (${client.subscriptions.length})`}
                      </button>
                      <button className="btn-primary" onClick={() => { setError(""); setSubForm(blankSubscription(client.id)); }}>+ Perfil</button>
                      <button className="icon-btn hover:!border-bad/40 hover:!bg-bad/10 hover:!text-red-400" title="Eliminar cliente" onClick={() => deleteClient(client.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.07] bg-black/10 px-4 pb-4 md:px-5 md:pb-5">
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Servicio y perfil</th>
                            <th>Cuenta</th>
                            <th>Precio</th>
                            <th>Garantía</th>
                            <th>Próximo pago</th>
                            <th>Estado</th>
                            <th className="text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {client.subscriptions.map((subscription) => {
                            const meta = statusMeta(subscription);
                            return (
                              <tr key={subscription.id}>
                                <td>
                                  <p className="font-semibold text-gray-200">{subscription.service_name}</p>
                                  <p className="mt-0.5 text-xs text-gray-500">{subscription.profile_name || "Perfil sin nombre"} · PIN {subscription.pin || "—"}</p>
                                </td>
                                <td className="max-w-[220px] truncate text-xs text-gray-500">{subscription.account_email || "—"}</td>
                                <td>{subscription.price ? `S/ ${Number(subscription.price).toFixed(2)}` : "—"}</td>
                                <td>{subscription.has_guarantee ? <span className="badge badge-good">{subscription.guarantee_days} días</span> : <span className="badge badge-neutral">No</span>}</td>
                                <td>
                                  <p>{formatDate(subscription.next_payment_date)}</p>
                                  <p className="mt-0.5 text-xs text-gray-600">Último: {formatDate(subscription.last_payment_date)}</p>
                                </td>
                                <td><span className={`badge ${meta.className}`}>{meta.label}</span></td>
                                <td className="text-right whitespace-nowrap">
                                  {subscription.status !== "cancelado" && (
                                    <div className="flex justify-end gap-3">
                                      <button
                                        className="text-xs font-semibold text-accent-light hover:underline"
                                        onClick={() => setRenewForm({
                                          subscription_id: subscription.id,
                                          payment_date: todayISO(),
                                          next_payment_date: "",
                                          amount: subscription.price || "",
                                          method: "Yape"
                                        })}
                                      >
                                        Renovar
                                      </button>
                                      <button className="text-xs font-semibold text-red-400 hover:underline" onClick={() => cancelSubscription(subscription.id)}>
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {client.subscriptions.length === 0 && (
                            <tr><td colSpan={7} className="py-8 text-center text-gray-600">Este cliente aún no tiene un perfil asignado.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showNewClient && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowNewClient(false)}>
          <div className="modal-panel max-w-xl">
            <ModalHeader title="Nuevo cliente por perfil" subtitle="Primero registra sus datos y luego selecciona la cuenta y el perfil." onClose={() => setShowNewClient(false)} />
            <form onSubmit={createClient} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Nombre completo</label>
                <input className="input" required autoFocus value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} />
              </div>
              <div>
                <label className="label">Teléfono / WhatsApp</label>
                <input className="input" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} />
              </div>
              <div>
                <label className="label">Correo</label>
                <input type="email" className="input" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notas</label>
                <textarea className="input min-h-[88px] resize-none" value={newClient.notes} onChange={(event) => setNewClient({ ...newClient, notes: event.target.value })} />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
              <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                <button className="btn-primary">Guardar y asignar perfil</button>
                <button type="button" className="btn-secondary" onClick={() => setShowNewClient(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subForm && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSubForm(null)}>
          <div className="modal-panel max-w-xl">
            <ModalHeader title="Asignar nuevo perfil" subtitle="Esta sección solo crea suscripciones por perfil." onClose={() => setSubForm(null)} />
            <form onSubmit={createSubscription} className="mt-5 space-y-4">
              <div className="rounded-2xl border border-accent/20 bg-accent/10 p-3.5">
                <p className="text-xs font-semibold text-accent-light">Tipo de venta: Perfil compartido</p>
              </div>
              <div>
                <label className="label">Servicio</label>
                <select
                  className="input"
                  required
                  value={subForm.service_id}
                  onChange={(event) => setSubForm({ ...subForm, service_id: event.target.value, account_id: "", profile_id: "" })}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </div>
              {subForm.service_id && (
                <div>
                  <label className="label">Cuenta compartida</label>
                  <select
                    className="input"
                    required
                    value={subForm.account_id}
                    onChange={(event) => setSubForm({ ...subForm, account_id: event.target.value, profile_id: "" })}
                  >
                    <option value="">Selecciona una cuenta</option>
                    {accountsForSelectedService.map((account) => (
                      <option key={account.id} value={account.id}>{account.email} · {account.free_profiles} libre(s)</option>
                    ))}
                  </select>
                  {accountsForSelectedService.length === 0 && <p className="mt-1.5 text-xs text-amber-400">No hay cuentas registradas para este servicio.</p>}
                </div>
              )}
              {subForm.account_id && (
                <ProfileSelect
                  accountId={subForm.account_id}
                  value={subForm.profile_id}
                  onChange={(value) => setSubForm({ ...subForm, profile_id: value })}
                />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Fecha de ingreso</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={subForm.join_date}
                    onChange={(event) => setSubForm({ ...subForm, join_date: event.target.value, last_payment_date: event.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Próximo pago</label>
                  <input type="date" className="input" required value={subForm.next_payment_date} onChange={(event) => setSubForm({ ...subForm, next_payment_date: event.target.value })} />
                </div>
                <div>
                  <label className="label">Precio (S/)</label>
                  <input type="number" min="0" step="0.01" className="input" value={subForm.price} onChange={(event) => setSubForm({ ...subForm, price: event.target.value })} />
                </div>
                <div>
                  <label className="label">Días de garantía</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={subForm.guarantee_days}
                    onChange={(event) => {
                      const days = Number(event.target.value);
                      setSubForm({ ...subForm, guarantee_days: days, has_guarantee: days > 0 });
                    }}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex flex-wrap gap-3 pt-2">
                <button className="btn-primary">Guardar perfil</button>
                <button type="button" className="btn-secondary" onClick={() => setSubForm(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renewForm && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRenewForm(null)}>
          <div className="modal-panel max-w-md">
            <ModalHeader title="Registrar renovación" subtitle="Guarda el pago y define la siguiente fecha de cobro." onClose={() => setRenewForm(null)} />
            <form onSubmit={renewSubscription} className="mt-5 space-y-4">
              <div>
                <label className="label">Fecha de pago</label>
                <input type="date" className="input" required value={renewForm.payment_date} onChange={(event) => setRenewForm({ ...renewForm, payment_date: event.target.value })} />
              </div>
              <div>
                <label className="label">Nuevo próximo pago</label>
                <input type="date" className="input" required value={renewForm.next_payment_date} onChange={(event) => setRenewForm({ ...renewForm, next_payment_date: event.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Monto (S/)</label>
                  <input type="number" min="0" step="0.01" className="input" value={renewForm.amount} onChange={(event) => setRenewForm({ ...renewForm, amount: event.target.value })} />
                </div>
                <div>
                  <label className="label">Método</label>
                  <select className="input" value={renewForm.method} onChange={(event) => setRenewForm({ ...renewForm, method: event.target.value })}>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button className="btn-primary">Confirmar renovación</button>
                <button type="button" className="btn-secondary" onClick={() => setRenewForm(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const classes = {
    accent: "bg-accent/15 text-accent-light",
    good: "bg-good/15 text-green-400",
    warn: "bg-warn/15 text-amber-400",
    bad: "bg-bad/15 text-red-400"
  };

  return (
    <div className="card-stat">
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes[tone]}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" /></svg>
      </div>
      <div className="relative z-10 min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="section-title text-lg">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <button className="icon-btn shrink-0" onClick={onClose} type="button" aria-label="Cerrar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="client-card animate-pulse p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.06]" />
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-white/[0.06]" />
              <div className="mt-2 h-3 w-64 max-w-full rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileSelect({ accountId, value, onChange }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/accounts/${accountId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setProfiles((data.profiles || []).filter((profile) => profile.status === "libre"));
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [accountId]);

  return (
    <div>
      <label className="label">Perfil disponible</label>
      <select className="input" required value={value} onChange={(event) => onChange(event.target.value)} disabled={loading}>
        <option value="">{loading ? "Cargando perfiles..." : "Selecciona un perfil libre"}</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>{profile.profile_name} · PIN {profile.pin || "sin asignar"}</option>
        ))}
      </select>
      {!loading && profiles.length === 0 && <p className="mt-1.5 text-xs text-amber-400">Esta cuenta no tiene perfiles libres.</p>}
    </div>
  );
}
