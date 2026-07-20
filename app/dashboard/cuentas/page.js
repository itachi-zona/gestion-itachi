"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function CuentasPage() {
  const [services, setServices] = useState([]);
  const [activeService, setActiveService] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showPass, setShowPass] = useState({});
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: "", password: "", billing_date: "", subscription_end: "", price: "", notes: "", create_profiles: true });
  const [error, setError] = useState("");

  async function loadServices() {
    const s = await fetch("/api/services").then((r) => r.json());
    setServices(s);
    if (!activeService && s.length) setActiveService(s[0].id);
  }

  async function loadAccounts(serviceId) {
    if (!serviceId) return;
    const a = await fetch(`/api/accounts?service_id=${serviceId}`).then((r) => r.json());
    setAccounts(a);
    if (a.length && (!selected || !a.find((x) => x.id === selected.id))) {
      loadDetail(a[0].id);
    } else if (!a.length) {
      setSelected(null);
    }
  }

  async function loadDetail(accountId) {
    const d = await fetch(`/api/accounts/${accountId}`).then((r) => r.json());
    setSelected(d);
  }

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (activeService) loadAccounts(activeService);
  }, [activeService]);

  async function createAccount(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAccount, service_id: activeService })
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo crear la cuenta.");
      return;
    }
    setNewAccount({ email: "", password: "", billing_date: "", subscription_end: "", price: "", notes: "", create_profiles: true });
    setShowNewAccount(false);
    loadAccounts(activeService);
  }

  async function deleteAccount(id) {
    if (!confirm("¿Eliminar esta cuenta y todos sus perfiles/suscripciones asociadas?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    setSelected(null);
    loadAccounts(activeService);
  }

  async function addProfile(accountId) {
    const name = prompt("Nombre del nuevo perfil (ej. Perfil 6):");
    if (!name) return;
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId, profile_name: name })
    });
    loadDetail(accountId);
    loadAccounts(activeService);
  }

  async function updatePin(profileId, accountId) {
    const pin = prompt("Nuevo PIN de 4 dígitos:");
    if (!pin) return;
    await fetch(`/api/profiles/${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    loadDetail(accountId);
  }

  async function releaseProfile(profileId, accountId) {
    if (!confirm("¿Liberar este perfil? Se cancelará la suscripción del cliente asignado.")) return;
    await fetch(`/api/profiles/${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" })
    });
    loadDetail(accountId);
    loadAccounts(activeService);
  }

  async function deleteProfile(profileId, accountId) {
    if (!confirm("¿Eliminar definitivamente este perfil? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    loadDetail(accountId);
    loadAccounts(activeService);
  }

  const freeCount = (a) => Number(a.free_profiles);

  return (
    <div>
      <Topbar title="Cuentas" />

      <div className="flex gap-2 mb-6 flex-wrap -mt-4">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveService(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              activeService === s.id ? "bg-accent border-accent text-white" : "border-border text-gray-400 hover:text-gray-200"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Cuentas</h2>
            <button className="btn-primary text-sm" onClick={() => setShowNewAccount(true)}>
              + Nueva cuenta
            </button>
          </div>

          {showNewAccount && (
            <form onSubmit={createAccount} className="grid grid-cols-2 gap-4 mb-6 border border-border rounded-lg p-4">
              <div className="col-span-2">
                <label className="label">Correo de la cuenta</label>
                <input className="input" required value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Contraseña</label>
                <input className="input" required value={newAccount.password} onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} />
              </div>
              <div>
                <label className="label">Fecha de facturación</label>
                <input type="date" className="input" value={newAccount.billing_date} onChange={(e) => setNewAccount({ ...newAccount, billing_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Fin de suscripción</label>
                <input type="date" className="input" value={newAccount.subscription_end} onChange={(e) => setNewAccount({ ...newAccount, subscription_end: e.target.value })} />
              </div>
              <div>
                <label className="label">Precio de la cuenta (S/)</label>
                <input type="number" step="0.01" className="input" value={newAccount.price} onChange={(e) => setNewAccount({ ...newAccount, price: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={newAccount.create_profiles}
                  onChange={(e) => setNewAccount({ ...newAccount, create_profiles: e.target.checked })}
                />
                <label className="text-sm text-gray-300">Crear perfiles automáticamente</label>
              </div>
              {error && <p className="text-red-400 text-sm col-span-2">{error}</p>}
              <div className="col-span-2 flex gap-3">
                <button className="btn-primary">Guardar cuenta</button>
                <button type="button" className="btn-secondary" onClick={() => setShowNewAccount(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Contraseña</th>
                <th>Facturación</th>
                <th>Fin suscripción</th>
                <th>Estado</th>
                <th>Perfiles libres</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className={selected?.id === a.id ? "bg-panel2/60" : "cursor-pointer"} onClick={() => loadDetail(a.id)}>
                  <td className="cursor-pointer">{a.email}</td>
                  <td>
                    <span className="font-mono">{showPass[a.id] ? a.password : "••••••••"}</span>{" "}
                    <button
                      className="text-xs text-accent-light"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPass({ ...showPass, [a.id]: !showPass[a.id] });
                      }}
                    >
                      {showPass[a.id] ? "ocultar" : "ver"}
                    </button>
                  </td>
                  <td>{a.billing_date ? new Date(a.billing_date).toLocaleDateString() : "—"}</td>
                  <td>{a.subscription_end ? new Date(a.subscription_end).toLocaleDateString() : "—"}</td>
                  <td>
                    <span className={`badge ${a.status === "activa" ? "badge-good" : "badge-bad"}`}>{a.status}</span>
                  </td>
                  <td className={freeCount(a) > 0 ? "text-green-400" : "text-gray-500"}>
                    {a.free_profiles} / {a.total_profiles}
                  </td>
                  <td className="text-right">
                    <button
                      className="text-red-400 text-xs hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAccount(a.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">
                    No hay cuentas registradas para este servicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <h2 className="font-semibold mb-4">Detalle de cuenta</h2>
          {!selected ? (
            <p className="text-gray-400 text-sm">Selecciona una cuenta para ver sus perfiles.</p>
          ) : (
            <>
              <p className="font-medium">{selected.email}</p>
              <p className="text-xs text-gray-400 mb-4">
                {selected.subscription_end ? `Vence ${new Date(selected.subscription_end).toLocaleDateString()}` : "Sin fecha de fin"}
              </p>
              <div className="space-y-2">
                {selected.profiles?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.profile_name}</p>
                      <p className="text-xs text-gray-400">
                        {p.client_name ? p.client_name : "Disponible"} · PIN {p.pin || "—"}
                      </p>
                      {p.client_name && (
                        <p className="text-xs text-gray-500">
                          Desde {p.join_date ? new Date(p.join_date).toLocaleDateString() : "—"} · Renueva{" "}
                          {p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString() : "—"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${p.status === "libre" ? "badge-good" : "badge-neutral"}`}>{p.status}</span>
                      <button className="text-xs text-accent-light hover:underline" onClick={() => updatePin(p.id, selected.id)}>
                        PIN
                      </button>
                      {p.status !== "libre" && (
                        <button className="text-xs text-amber-400 hover:underline" onClick={() => releaseProfile(p.id, selected.id)}>
                          Liberar
                        </button>
                      )}
                      <button className="text-xs text-red-400 hover:underline" onClick={() => deleteProfile(p.id, selected.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-secondary w-full mt-4 text-sm" onClick={() => addProfile(selected.id)}>
                + Agregar perfil
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
