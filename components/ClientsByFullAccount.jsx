"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function formatDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  return new Date(`${raw}T00:00:00`).toLocaleDateString("es-PE");
}

function initials(name) {
  return String(name || "SC")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function clientKey(rental) {
  const name = String(rental.client_name || "").trim().toLowerCase();
  const phone = String(rental.client_phone || "").replace(/\s+/g, "").toLowerCase();
  const email = String(rental.client_email || "").trim().toLowerCase();
  if (name || phone || email) return `${name}|${phone}|${email}`;
  return `sin-cliente-${rental.id}`;
}

function accountStatus(rental) {
  if (rental.status === "cancelada") return { label: "Cancelada", className: "badge-neutral" };
  const days = Number(rental.days_left);
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)} d.`, className: "badge-bad" };
  if (days === 0) return { label: "Vence hoy", className: "badge-warn" };
  if (days <= 3) return { label: `Vence en ${days} d.`, className: "badge-warn" };
  return { label: `${days} días`, className: "badge-good" };
}

function filterMatchesStatus(rental, filter) {
  const days = Number(rental.days_left);
  if (filter === "activa") return rental.status !== "cancelada" && days > 3;
  if (filter === "por_vencer") return rental.status !== "cancelada" && days >= 0 && days <= 3;
  if (filter === "vencida") return rental.status !== "cancelada" && days < 0;
  if (filter === "cancelada") return rental.status === "cancelada";
  if (filter === "sin_cliente") return !rental.client_name && !rental.client_phone && !rental.client_email;
  return true;
}

function nearestExpiration(rentals) {
  const valid = rentals
    .filter((rental) => rental.status !== "cancelada" && rental.final_expiration_date)
    .sort((a, b) => String(a.final_expiration_date).localeCompare(String(b.final_expiration_date)));
  return valid[0] ? formatDate(valid[0].final_expiration_date) : "Sin fecha";
}

export default function ClientsByFullAccount() {
  const [rentals, setRentals] = useState([]);
  const [services, setServices] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editing, setEditing] = useState(null);
  const [applyToGroup, setApplyToGroup] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [rentalResponse, serviceResponse] = await Promise.all([
        fetch("/api/rental-accounts"),
        fetch("/api/services")
      ]);
      const [rentalData, serviceData] = await Promise.all([rentalResponse.json(), serviceResponse.json()]);
      setRentals(Array.isArray(rentalData) ? rentalData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const allGroups = useMemo(() => {
    const map = new Map();
    for (const rental of rentals) {
      const key = clientKey(rental);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: rental.client_name || "Sin cliente asignado",
          phone: rental.client_phone || "",
          email: rental.client_email || "",
          rentals: []
        });
      }
      map.get(key).rentals.push(rental);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [rentals]);

  const counts = useMemo(() => {
    return {
      clients: allGroups.filter((group) => group.name !== "Sin cliente asignado").length,
      active: rentals.filter((rental) => rental.status !== "cancelada" && Number(rental.days_left) >= 0).length,
      expiring: rentals.filter((rental) => rental.status !== "cancelada" && Number(rental.days_left) >= 0 && Number(rental.days_left) <= 3).length,
      expired: rentals.filter((rental) => rental.status !== "cancelada" && Number(rental.days_left) < 0).length
    };
  }, [allGroups, rentals]);

  const visibleGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filteredRentals = rentals.filter((rental) => {
      if (serviceFilter && String(rental.service_id) !== String(serviceFilter)) return false;
      if (!filterMatchesStatus(rental, statusFilter)) return false;

      if (!normalizedSearch) return true;
      const haystack = [
        rental.client_name,
        rental.client_phone,
        rental.client_email,
        rental.service_name,
        rental.email,
        rental.provider_name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    const grouped = new Map();
    for (const rental of filteredRentals) {
      const key = clientKey(rental);
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          name: rental.client_name || "Sin cliente asignado",
          phone: rental.client_phone || "",
          email: rental.client_email || "",
          rentals: []
        });
      }
      grouped.get(key).rentals.push(rental);
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [rentals, search, serviceFilter, statusFilter]);

  function openEdit(group) {
    setError("");
    setApplyToGroup(group.rentals.length > 1);
    setEditing({
      groupKey: group.key,
      ids: group.rentals.map((rental) => rental.id),
      sourceId: group.rentals[0].id,
      client_name: group.name === "Sin cliente asignado" ? "" : group.name,
      client_phone: group.phone || "",
      client_email: group.email || ""
    });
  }

  async function saveContact(event) {
    event.preventDefault();
    setError("");

    const ids = applyToGroup ? editing.ids : [editing.sourceId];
    const responses = await Promise.all(
      ids.map((id) =>
        fetch(`/api/rental-accounts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name: editing.client_name,
            client_phone: editing.client_phone,
            client_email: editing.client_email
          })
        })
      )
    );

    if (responses.some((response) => !response.ok)) {
      setError("No se pudo actualizar el contacto del cliente.");
      return;
    }

    setEditing(null);
    await loadAll();
  }

  return (
    <div>
      <Topbar
        eyebrow="Clientes"
        title="Clientes de cuentas completas"
        subtitle="Vista exclusiva de las personas que alquilan una cuenta completa. Los datos se obtienen directamente del módulo de cuentas completas."
      />

      <section className="hero-panel mb-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="badge badge-pink mb-3">Cuenta exclusiva</span>
            <h2 className="text-xl font-semibold text-white">Un cliente, una cuenta completa</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Revisa contactos, servicios contratados, montos, fechas de vencimiento y cuentas pendientes de asignar.
            </p>
          </div>
          <Link href="/dashboard/cuentas-completas" className="btn-primary shrink-0">
            <span className="text-lg leading-none">+</span> Nueva cuenta completa
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        <StatCard label="Clientes completos" value={counts.clients} tone="accent" />
        <StatCard label="Cuentas activas" value={counts.active} tone="good" />
        <StatCard label="Por vencer" value={counts.expiring} tone="warn" />
        <StatCard label="Vencidas" value={counts.expired} tone="bad" />
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
              placeholder="Buscar cliente, teléfono, servicio o correo de cuenta..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="input sm:max-w-[230px]" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            <option value="">Todos los servicios</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500 shrink-0">{visibleGroups.length} cliente(s)</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["todos", "Todos"],
          ["activa", "Activas"],
          ["por_vencer", "Por vencer"],
          ["vencida", "Vencidas"],
          ["cancelada", "Canceladas"],
          ["sin_cliente", "Sin cliente asignado"]
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
      ) : visibleGroups.length === 0 ? (
        <div className="empty-state">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /></svg>
          </div>
          <h3 className="font-semibold text-gray-200">No hay clientes que coincidan</h3>
          <p className="mt-1 text-sm text-gray-500">Cambia los filtros o registra una cuenta completa nueva.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const isExpanded = expanded === group.key;
            const activeCount = group.rentals.filter((rental) => rental.status !== "cancelada" && Number(rental.days_left) >= 0).length;
            const monthlyTotal = group.rentals.reduce((total, rental) => total + (Number(rental.amount) || 0), 0);
            const serviceNames = [...new Set(group.rentals.map((rental) => rental.service_name).filter(Boolean))];

            return (
              <article key={group.key} className="client-card">
                <div className="client-card-header">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="avatar-ring border-pink-500/25 bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-300">{initials(group.name)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-white">{group.name}</h3>
                        {group.name === "Sin cliente asignado" && <span className="badge badge-warn">Pendiente</span>}
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {group.phone || "Sin teléfono"}{group.email ? ` · ${group.email}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {serviceNames.slice(0, 3).map((name) => <span key={name} className="badge badge-pink">{name}</span>)}
                        {serviceNames.length > 3 && <span className="badge badge-neutral">+{serviceNames.length - 3}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="metric-chip min-w-[88px]">
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">Cuentas</p>
                        <p className="mt-0.5 font-semibold text-gray-200">{group.rentals.length}</p>
                      </div>
                      <div className="metric-chip min-w-[105px]">
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">Activas</p>
                        <p className="mt-0.5 font-semibold text-gray-200">{activeCount}</p>
                      </div>
                      <div className="metric-chip min-w-[118px]">
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">Ingreso</p>
                        <p className="mt-0.5 font-semibold text-gray-200">S/ {monthlyTotal.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => setExpanded(isExpanded ? null : group.key)}>
                        {isExpanded ? "Ocultar" : "Ver cuentas"}
                      </button>
                      <button className="btn-primary" onClick={() => openEdit(group)}>Editar cliente</button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.07] bg-black/10 px-4 pb-4 md:px-5 md:pb-5">
                    <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">Próximo vencimiento del cliente: <span className="font-semibold text-gray-300">{nearestExpiration(group.rentals)}</span></p>
                      <Link href="/dashboard/cuentas-completas" className="text-xs font-semibold text-accent-light hover:underline">Abrir gestión completa →</Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Servicio</th>
                            <th>Correo de la cuenta</th>
                            <th>Monto</th>
                            <th>Creación</th>
                            <th>Caducación final</th>
                            <th>Estado</th>
                            <th>Proveedor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rentals.map((rental) => {
                            const meta = accountStatus(rental);
                            return (
                              <tr key={rental.id}>
                                <td className="font-semibold text-gray-200">{rental.service_name || "Sin servicio"}</td>
                                <td className="max-w-[260px] truncate text-xs text-gray-500">{rental.email}</td>
                                <td>{rental.amount ? `S/ ${Number(rental.amount).toFixed(2)}` : "—"}</td>
                                <td>{formatDate(rental.account_created_date)}</td>
                                <td>
                                  <p>{formatDate(rental.final_expiration_date)}</p>
                                  {Number(rental.extra_days) > 0 && <p className="mt-0.5 text-xs text-gray-600">Incluye +{rental.extra_days} día(s)</p>}
                                </td>
                                <td><span className={`badge ${meta.className}`}>{meta.label}</span></td>
                                <td>
                                  <p>{rental.provider_name || "—"}</p>
                                  {rental.provider_next_payment_date && <p className="mt-0.5 text-xs text-gray-600">Pagar: {formatDate(rental.provider_next_payment_date)}</p>}
                                </td>
                              </tr>
                            );
                          })}
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

      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <div className="modal-panel max-w-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="section-title text-lg">Editar datos del cliente</h2>
                <p className="mt-1 text-sm text-gray-500">Actualiza la información de contacto asociada a la cuenta completa.</p>
              </div>
              <button className="icon-btn shrink-0" type="button" onClick={() => setEditing(null)} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <form onSubmit={saveContact} className="mt-5 space-y-4">
              <div>
                <label className="label">Nombre del cliente</label>
                <input className="input" required autoFocus value={editing.client_name} onChange={(event) => setEditing({ ...editing, client_name: event.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Teléfono / WhatsApp</label>
                  <input className="input" value={editing.client_phone} onChange={(event) => setEditing({ ...editing, client_phone: event.target.value })} />
                </div>
                <div>
                  <label className="label">Correo del cliente</label>
                  <input type="email" className="input" value={editing.client_email} onChange={(event) => setEditing({ ...editing, client_email: event.target.value })} />
                </div>
              </div>

              {editing.ids.length > 1 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <input type="checkbox" className="mt-0.5" checked={applyToGroup} onChange={(event) => setApplyToGroup(event.target.checked)} />
                  <span>
                    <span className="block text-sm font-semibold text-gray-300">Actualizar sus {editing.ids.length} cuentas</span>
                    <span className="mt-0.5 block text-xs text-gray-600">Mantiene el mismo contacto en todas las cuentas completas de este cliente.</span>
                  </span>
                </label>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex flex-wrap gap-3 pt-2">
                <button className="btn-primary">Guardar cambios</button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /></svg>
      </div>
      <div className="relative z-10 min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-white">{value}</p>
      </div>
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
              <div className="h-4 w-44 rounded bg-white/[0.06]" />
              <div className="mt-2 h-3 w-72 max-w-full rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
