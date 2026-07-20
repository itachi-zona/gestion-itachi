"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function ServiciosPage() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", max_profiles: 1, color: "#6d5bf6" });
  const [error, setError] = useState("");

  async function load() {
    setServices(await fetch("/api/services").then((r) => r.json()));
  }

  useEffect(() => {
    load();
  }, []);

  async function createService(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo crear el servicio.");
      return;
    }
    setForm({ name: "", slug: "", max_profiles: 1, color: "#6d5bf6" });
    load();
  }

  async function deleteService(s) {
    if (!confirm(`¿Eliminar el servicio "${s.name}"? Esto también eliminará sus cuentas y perfiles, y cancelará las suscripciones activas que lo usen.`)) return;
    await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Topbar title="Servicios" />
      <p className="text-gray-400 -mt-6 mb-8 text-sm">
        Aquí defines qué plataformas vendes (Netflix, Disney+, ChatGPT, Gemini, u otras apps) y cuántos perfiles caben en cada cuenta.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card md:col-span-1 h-fit">
          <h2 className="font-semibold mb-4">Nuevo servicio</h2>
          <form onSubmit={createService} className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Spotify" />
            </div>
            <div>
              <label className="label">Slug (sin espacios)</label>
              <input className="input" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="spotify" />
            </div>
            <div>
              <label className="label">Perfiles máximos por cuenta</label>
              <input type="number" className="input" value={form.max_profiles} onChange={(e) => setForm({ ...form, max_profiles: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" className="input h-10" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn-primary w-full">Crear servicio</button>
          </form>
        </div>

        <div className="card md:col-span-2">
          <h2 className="font-semibold mb-4">Servicios existentes</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Slug</th>
                <th>Perfiles máx.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: s.color }} />
                    {s.name}
                  </td>
                  <td>{s.slug}</td>
                  <td>{s.max_profiles}</td>
                  <td className="text-right">
                    <button className="text-xs text-red-400 hover:underline" onClick={() => deleteService(s)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
