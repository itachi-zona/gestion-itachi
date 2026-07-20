"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";

function StatCard({ label, value, tone = "neutral" }) {
  const toneClass = {
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
    neutral: "text-accent-light"
  }[tone];
  return (
    <div className="card">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-display font-bold mt-2 ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div>
      <Topbar title="¡Bienvenido!" />

      {!stats ? (
        <p className="text-gray-400">Cargando estadísticas...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Clientes activos" value={stats.clientesActivos} tone="good" />
            <StatCard label="Clientes nuevos del mes" value={stats.clientesNuevosMes} />
            <StatCard label="Por vencer (3 días)" value={stats.porVencer} tone="warn" />
            <StatCard label="Vencidos" value={stats.vencidos} tone="bad" />
            <StatCard label="Cancelados" value={stats.cancelados} tone="bad" />
            <StatCard label="Perfiles vendidos" value={stats.perfilesVendidos} />
            <StatCard label="Cuentas completas vendidas" value={stats.cuentasCompletasVendidas} />
            <StatCard label="Perfiles disponibles" value={stats.perfilesLibres} tone="good" />
            <StatCard label="Cuentas registradas" value={stats.cuentas} />
            <StatCard label="Ingresos del día" value={`S/ ${stats.ingresosDia.toFixed(2)}`} tone="good" />
            <StatCard label="Ingresos del mes" value={`S/ ${stats.ingresosMes.toFixed(2)}`} tone="good" />
            <StatCard label="Dinero pendiente de cobro" value={`S/ ${stats.pendienteCobro.toFixed(2)}`} tone="warn" />
          </div>

          <div className="card mb-6">
            <h2 className="font-semibold mb-4">Alertas principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-gray-400">Clientes que pagan hoy</span>
                <span className="font-semibold">{stats.paganHoy.length}</span>
              </div>
              <div className="flex justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-gray-400">Clientes que pagan mañana</span>
                <span className="font-semibold">{stats.paganMananaCount}</span>
              </div>
              <div className="flex justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-gray-400">Clientes con pago vencido</span>
                <span className="font-semibold text-red-400">{stats.vencidos}</span>
              </div>
              <div className="flex justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-gray-400">Cuentas próximas a vencer</span>
                <span className="font-semibold text-amber-400">{stats.porVencer}</span>
              </div>
            </div>
          </div>

          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Próximos pagos</h2>
              <Link href="/dashboard/renovaciones" className="text-xs text-accent-light hover:underline">
                Ver todas las renovaciones →
              </Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th>Monto</th>
                  <th>Próximo pago</th>
                  <th>Días</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {stats.proximosPagos.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.client_name}</td>
                    <td>{p.service_name}</td>
                    <td className="text-gray-400">{p.type === "perfil" ? "Perfil" : "Cuenta completa"}</td>
                    <td className="text-gray-400">{p.client_phone || "—"}</td>
                    <td>{p.price ? `S/ ${Number(p.price).toFixed(2)}` : "—"}</td>
                    <td className="text-gray-400">{new Date(p.next_payment_date).toLocaleDateString()}</td>
                    <td className={Number(p.days_left) < 0 ? "text-red-400" : ""}>{Number(p.days_left)}</td>
                    <td>
                      <span className={`badge ${p.computed_status === "vencido" ? "badge-bad" : p.computed_status === "por_vencer" ? "badge-warn" : "badge-good"}`}>
                        {p.computed_status === "vencido" ? "Vencido" : p.computed_status === "por_vencer" ? "Por vencer" : "Activo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.proximosPagos.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-500 py-4">No hay pagos próximos.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Resumen por servicio</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Cuentas</th>
                  <th>Clientes con suscripción activa</th>
                </tr>
              </thead>
              <tbody>
                {stats.porServicio.map((s) => (
                  <tr key={s.slug}>
                    <td className="font-medium">{s.name}</td>
                    <td>{s.cuentas}</td>
                    <td>{s.clientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
