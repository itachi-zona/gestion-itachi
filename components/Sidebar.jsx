"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6" },
  { href: "/dashboard/servicios", label: "Servicios", icon: "M4 6h16M4 12h16M4 18h16" },
  { href: "/dashboard/cuentas", label: "Cuentas", icon: "M3 5h18v14H3zM3 9h18" },
  { href: "/dashboard/cuentas-completas", label: "Cuentas completas", icon: "M12 15a2 2 0 100-4 2 2 0 000 4zM6 10V7a6 6 0 1112 0v3M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" },
  { href: "/dashboard/pagos", label: "Pagos", icon: "M2 8h20M2 4h20v16H2z" },
  { href: "/dashboard/perfiles", label: "Perfiles", icon: "M16 4h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 4a2 2 0 002 2h2a2 2 0 002-2M9 12h6M9 16h6" },
  { href: "/dashboard/renovaciones", label: "Renovaciones", icon: "M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0014.9 3.5M19.5 9a8 8 0 00-14.9-3.5" },
  { href: "/dashboard/cancelados", label: "Cancelados", icon: "M6 6l12 12M6 18L18 6" },
  { href: "/dashboard/reportes", label: "Reportes", icon: "M4 20V10M10 20V4M16 20v-7M4 20h16" },
  { href: "/dashboard/chat", label: "Chat IA", icon: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
  { href: "/dashboard/ajustes", label: "Ajustes", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-panel border-r border-border min-h-screen p-5 hidden md:block">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 18v3" />
          </svg>
        </div>
        <span className="font-display font-bold text-lg">Streaming Manager</span>
      </div>

      <nav className="space-y-1">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-accent text-white" : "text-gray-400 hover:bg-panel2 hover:text-gray-200"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={l.icon} />
              </svg>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
