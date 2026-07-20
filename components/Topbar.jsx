"use client";
import { useRouter } from "next/navigation";

export default function Topbar({ title, subtitle, eyebrow }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-start justify-between gap-4 mb-7 md:mb-9">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent-light/80 font-semibold mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      <button onClick={logout} className="btn-secondary text-sm shrink-0">
        Cerrar sesión
      </button>
    </header>
  );
}
