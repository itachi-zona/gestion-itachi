"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "vendedor" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "No se pudo crear el usuario.");
      return;
    }
    setForm({ username: "", password: "", full_name: "", role: "vendedor" });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este usuario? No podrá volver a iniciar sesión.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Topbar title="Panel de administración" />
      <p className="text-gray-400 -mt-6 mb-8 text-sm">
        Aquí creas las credenciales de acceso para quien gestionará clientes y cuentas en el panel de usuario.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card md:col-span-1 h-fit">
          <h2 className="font-semibold mb-4">Crear nuevo acceso</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ej. Alonso Vendedor"
              />
            </div>
            <div>
              <label className="label">Usuario</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="usuario"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Contraseña"
                required
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="vendedor">Vendedor (panel de gestión)</option>
                <option value="admin">Administrador (puede crear más accesos)</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Creando..." : "Crear acceso"}
            </button>
          </form>
        </div>

        <div className="card md:col-span-2">
          <h2 className="font-semibold mb-4">Accesos existentes</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-warn" : "badge-good"}`}>
                      {u.role === "admin" ? "Administrador" : "Vendedor"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 text-xs hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-gray-500 text-center py-6">
                    Aún no hay accesos creados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
