"use client";
import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";

function statusInfo(p) {
  if (p.status === "libre") return { label: "Libre", cls: "badge-good" };
  if (!p.next_payment_date) return { label: "Ocupado", cls: "badge-neutral" };
  const days = Number(p.days_left);
  if (days < 0) return { label: "Vencido", cls: "badge-bad" };
  if (days <= 3) return { label: "Por vencer", cls: "badge-warn" };
  return { label: "Activo", cls: "badge-good" };
}

export default function PerfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    const [p, s] = await Promise.all([
      fetch("/api/profiles").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json())
    ]);
    setProfiles(p);
    setServices(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function releaseProfile(p) {
    if (!confirm(`¿Liberar el perfil "${p.profile_name}"? Esto cancelará la suscripción de ${p.client_name || "este cliente"}.`)) return;
    await fetch(`/api/profiles/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" })
    });
    load();
  }

  async function deleteProfile(p) {
    if (!confirm(`¿Eliminar definitivamente el perfil "${p.profile_name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
    load();
  }

  async function editPin(p) {
    const pin = prompt("Nuevo PIN de 4 dígitos:", p.pin || "");
    if (pin === null) return;
    await fetch(`/api/profiles/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    load();
  }

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (serviceFilter && p.service_slug !== serviceFilter) return false;
      if (statusFilter === "libre" && p.status !== "libre") return false;
      if (statusFilter === "ocupado" && p.status !== "ocupado") return false;
      if (statusFilter === "vencido" && !(p.status === "ocupado" && Number(p.days_left) < 0)) return false;
      if (statusFilter === "por_vencer" && !(p.status === "ocupado" && Number(p.days_left) >= 0 && Number(p.days_left) <= 3)) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${p.profile_name} ${p.client_name || ""} ${p.client_phone || ""} ${p.account_email} ${p.service_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [profiles, serviceFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const total = profiles.length;
    const libres = profiles.filter((p) => p.status === "libre").length;
    const ocupados = total - libres;
    const porVencer = profiles.filter((p) => p.status === "ocupado" && Number(p.days_left) >= 0 && Number(p.days_left) <= 3).length;
    const vencidos = profiles.filter((p) => p.status === "ocupado" && Number(p.days_left) < 0).length;
    return { total, libres, ocupados, porVencer, vencidos };
  }, [profiles]);

  return (
    <div>
      <Topbar title="Perfiles" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 -mt-2">
        <div className="card"><p className="text-gray-400 text-sm">Total perfiles</p><p className="text-2xl font-display font-bold mt-1">{summary.total}</p></div>
        <div className="card"><p className="text-gray-400 text-sm">Libres</p><p className="text-2xl font-display font-bold mt-1 text-good">{summary.libres}</p></div>
        <div className="card"><p className="text-gray-400 text-sm">Ocupados</p><p className="text-2xl font-display font-bold mt-1 text-accent-light">{summary.ocupados}</p></div>
        <div className="card"><p className="text-gray-400 text-sm">Por vencer</p><p className="text-2xl font-display font-bold mt-1 text-warn">{summary.porVencer}</p></div>
        <div className="card"><p className="text-gray-400 text-sm">Vencidos</p><p className="text-2xl font-display font-bold mt-1 text-bad">{summary.vencidos}</p></div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className="input max-w-xs"
          placeholder="Buscar por cliente, celular, correo o servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[180px]" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
          <option value="">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.slug}>{s.name}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="libre">Libres</option>
          <option value="ocupado">Ocupados</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vencido">Vencidos</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Cuenta</th>
              <th>Perfil</th>
              <th>PIN</th>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Creado</th>
              <th>Asignado</th>
              <th>Próx. pago</th>
              <th>Días</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const st = statusInfo(p);
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.service_name}</td>
                  <td className="text-gray-400">{p.account_email}</td>
                  <td>{p.profile_name}</td>
                  <td>
                    <button className="text-xs text-accent-light hover:underline" onClick={() => editPin(p)}>
                      {p.pin || "—"}
                    </button>
                  </td>
                  <td>{p.client_name || <span className="text-gray-500">Disponible</span>}</td>
                  <td className="text-gray-400">{p.client_phone || "—"}</td>
                  <td className="text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                  <td className="text-gray-400">{p.join_date ? new Date(p.join_date).toLocaleDateString() : "—"}</td>
                  <td className="text-gray-400">{p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString() : "—"}</td>
                  <td className={Number(p.days_left) < 0 ? "text-red-400" : "text-gray-400"}>
                    {p.days_left !== null && p.days_left !== undefined ? Number(p.days_left) : "—"}
                  </td>
                  <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td className="text-right whitespace-nowrap space-x-2">
                    {p.status === "ocupado" && (
                      <button className="text-xs text-amber-400 hover:underline" onClick={() => releaseProfile(p)}>
                        Liberar
                      </button>
                    )}
                    <button className="text-xs text-red-400 hover:underline" onClick={() => deleteProfile(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-gray-500 py-6">
                  No hay perfiles que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
