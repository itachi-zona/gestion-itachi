"use client";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function ReportesPage() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const rows = await fetch(`/api/reports?${params.toString()}`).then((r) => r.json());
    setData(rows);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Topbar title="Reportes" />

      <div className="flex flex-wrap items-end gap-3 mb-6 -mt-2">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={load}>Filtrar</button>
        <button className="btn-secondary" onClick={() => window.print()}>Imprimir</button>
      </div>

      {!data ? (
        <p className="text-gray-400">Cargando reportes...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card lg:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Ingresos totales (rango)</p>
              <p className="text-2xl font-display font-bold mt-1 text-good">
                S/ {Number(data.totales.ingresos_totales).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pagos registrados</p>
              <p className="text-2xl font-display font-bold mt-1">{data.totales.pagos_totales}</p>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Ingresos por servicio</h2>
            <table className="data-table">
              <thead><tr><th>Servicio</th><th>Pagos</th><th>Total</th></tr></thead>
              <tbody>
                {data.ingresosPorServicio.map((r) => (
                  <tr key={r.slug}>
                    <td>{r.name}</td>
                    <td>{r.count}</td>
                    <td>S/ {Number(r.total).toFixed(2)}</td>
                  </tr>
                ))}
                {data.ingresosPorServicio.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-500 py-4">Sin datos en este rango.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Servicios más vendidos</h2>
            <table className="data-table">
              <thead><tr><th>Servicio</th><th>Suscripciones activas</th></tr></thead>
              <tbody>
                {data.serviciosMasVendidos.map((r) => (
                  <tr key={r.slug}>
                    <td>{r.name}</td>
                    <td>{r.ventas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Ventas por día</h2>
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Pagos</th><th>Total</th></tr></thead>
              <tbody>
                {data.ventasPorDia.map((r) => (
                  <tr key={r.day}>
                    <td>{new Date(r.day).toLocaleDateString()}</td>
                    <td>{r.count}</td>
                    <td>S/ {Number(r.total).toFixed(2)}</td>
                  </tr>
                ))}
                {data.ventasPorDia.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-500 py-4">Sin ventas en este rango.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Clientes con más antigüedad</h2>
            <table className="data-table">
              <thead><tr><th>Cliente</th><th>Desde</th><th>Días como cliente</th></tr></thead>
              <tbody>
                {data.clientesMasAntiguos.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.join_date ? new Date(r.join_date).toLocaleDateString() : "—"}</td>
                    <td>{r.dias_como_cliente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card lg:col-span-2">
            <h2 className="font-semibold mb-4">Ganancia estimada por cuenta principal</h2>
            <table className="data-table">
              <thead><tr><th>Correo</th><th>Servicio</th><th>Costo cuenta</th><th>Ingresos generados</th><th>Ganancia estimada</th></tr></thead>
              <tbody>
                {data.gananciaPorCuenta.map((r, i) => (
                  <tr key={i}>
                    <td>{r.email}</td>
                    <td>{r.service_name}</td>
                    <td>{r.costo_cuenta ? `S/ ${Number(r.costo_cuenta).toFixed(2)}` : "—"}</td>
                    <td>S/ {Number(r.ingresos_generados).toFixed(2)}</td>
                    <td className={Number(r.ganancia_estimada) >= 0 ? "text-green-400" : "text-red-400"}>
                      S/ {Number(r.ganancia_estimada).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
