"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Principal",
    links: [
      {
        href: "/dashboard",
        label: "Dashboard",
        exact: true,
        icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
      }
    ]
  },
  {
    label: "Clientes",
    links: [
      {
        href: "/dashboard/clientes/perfiles",
        label: "Clientes por perfil",
        icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
      },
      {
        href: "/dashboard/clientes/cuentas-completas",
        label: "Clientes cuenta completa",
        icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6M17 8h4M19 6v4"
      }
    ]
  },
  {
    label: "Inventario",
    links: [
      { href: "/dashboard/servicios", label: "Servicios", icon: "M4 6h16M4 12h16M4 18h16" },
      { href: "/dashboard/cuentas", label: "Cuentas por perfiles", icon: "M3 5h18v14H3zM3 9h18" },
      {
        href: "/dashboard/cuentas-completas",
        label: "Cuentas completas",
        icon: "M12 15a2 2 0 100-4 2 2 0 000 4zM6 10V7a6 6 0 1112 0v3M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z"
      },
      { href: "/dashboard/perfiles", label: "Perfiles", icon: "M16 4h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 4a2 2 0 002 2h2a2 2 0 002-2M9 12h6M9 16h6" },
      { href: "/dashboard/pagos", label: "Pagos", icon: "M2 8h20M2 4h20v16H2z" }
    ]
  },
  {
    label: "Seguimiento",
    links: [
      { href: "/dashboard/renovaciones", label: "Renovaciones", icon: "M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0014.9 3.5M19.5 9a8 8 0 00-14.9-3.5" },
      { href: "/dashboard/cancelados", label: "Cancelados", icon: "M6 6l12 12M6 18L18 6" },
      { href: "/dashboard/reportes", label: "Reportes", icon: "M4 20V10M10 20V4M16 20v-7M4 20h16" },
      { href: "/dashboard/chat", label: "Chat IA", icon: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
      { href: "/dashboard/ajustes", label: "Ajustes", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" }
    ]
  }
];

function NavIcon({ path }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[276px] shrink-0 sticky top-0 h-screen flex-col border-r border-white/[0.07] bg-[#0d0f1b]/95 backdrop-blur-xl px-4 py-5 overflow-y-auto">
      <div className="flex items-center gap-3 px-2 mb-7">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent-light to-accent-dark flex items-center justify-center shadow-lg shadow-accent/25">
          <div className="absolute inset-[1px] rounded-[11px] border border-white/20" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 18v3" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[15px] leading-tight text-white">Streaming</p>
          <p className="font-display font-bold text-[15px] leading-tight text-accent-light">Manager</p>
        </div>
      </div>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.links.map((link) => {
                const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-accent/25 to-accent/10 text-white ring-1 ring-inset ring-accent/35 shadow-sm shadow-accent/10"
                        : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent-light" />}
                    <span className={`transition-colors ${active ? "text-accent-light" : "text-gray-500 group-hover:text-gray-300"}`}>
                      <NavIcon path={link.icon} />
                    </span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-4">
          <p className="text-xs font-semibold text-gray-200">Gestión organizada</p>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Perfiles y cuentas completas ahora están separados por tipo de cliente.</p>
        </div>
      </div>
    </aside>
  );
}
