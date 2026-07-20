"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function AjustesPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [userId, setUserId] = useState(null);

  async function load() {
    const s = await fetch("/api/settings").then((r) => r.json());
    setSettings(s);
    const me = await fetch("/api/auth/me").then((r) => r.json());
    setUserId(me?.user?.id || null);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(e) {
    e.preventDefault();
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg("");
    if (!pwForm.password || pwForm.password.length < 6) {
      setPwMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwMsg("Las contraseñas no coinciden.");
      return;
    }
    if (!userId) return;
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwForm.password })
    });
    if (res.ok) {
      setPwMsg("Contraseña actualizada correctamente.");
      setPwForm({ password: "", confirm: "" });
    } else {
      setPwMsg("No se pudo actualizar la contraseña.");
    }
  }

  if (!settings) return (
    <div>
      <Topbar title="Ajustes" />
      <p className="text-gray-400">Cargando ajustes...</p>
    </div>
  );

  return (
    <div>
      <Topbar title="Ajustes" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Datos del negocio</h2>
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="label">Nombre del negocio</label>
              <input className="input" value={settings.business_name || ""} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Número de WhatsApp</label>
                <input className="input" value={settings.whatsapp_number || ""} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="51987654321" />
              </div>
              <div>
                <label className="label">Usuario de Telegram</label>
                <input className="input" value={settings.telegram_user || ""} onChange={(e) => setSettings({ ...settings, telegram_user: e.target.value })} placeholder="@usuario" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Moneda</label>
                <select className="input" value={settings.currency || "PEN"} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares ($)</option>
                  <option value="EUR">Euros (€)</option>
                </select>
              </div>
              <div>
                <label className="label">País</label>
                <input className="input" value={settings.country || ""} onChange={(e) => setSettings({ ...settings, country: e.target.value })} />
              </div>
              <div>
                <label className="label">Zona horaria</label>
                <input className="input" value={settings.timezone || ""} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Días de anticipación para alertas</label>
                <input type="number" className="input" value={settings.alert_days ?? 3} onChange={(e) => setSettings({ ...settings, alert_days: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Garantía predeterminada (días)</label>
                <input type="number" className="input" value={settings.default_guarantee_days ?? 3} onChange={(e) => setSettings({ ...settings, default_guarantee_days: Number(e.target.value) })} />
              </div>
            </div>
            {saved && <p className="text-green-400 text-sm">Guardado correctamente.</p>}
            <button className="btn-primary">Guardar ajustes</button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Mensajes automáticos</h2>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="label">Antes del vencimiento</label>
                <textarea className="input" rows={2} value={settings.reminder_before || ""} onChange={(e) => setSettings({ ...settings, reminder_before: e.target.value })} />
              </div>
              <div>
                <label className="label">El día del vencimiento</label>
                <textarea className="input" rows={2} value={settings.reminder_due || ""} onChange={(e) => setSettings({ ...settings, reminder_due: e.target.value })} />
              </div>
              <div>
                <label className="label">Pago vencido</label>
                <textarea className="input" rows={2} value={settings.reminder_overdue || ""} onChange={(e) => setSettings({ ...settings, reminder_overdue: e.target.value })} />
              </div>
              <p className="text-xs text-gray-500">Usa {"{servicio}"}, {"{dias}"} y {"{monto}"} como marcadores.</p>
              <button className="btn-primary">Guardar mensajes</button>
            </form>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Seguridad</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <input type="password" className="input" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} />
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input type="password" className="input" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
              {pwMsg && <p className={`text-sm ${pwMsg.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>{pwMsg}</p>}
              <button className="btn-primary">Cambiar contraseña</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
