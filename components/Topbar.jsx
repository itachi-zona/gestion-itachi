"use client";
import { useRouter } from "next/navigation";

export default function Topbar({ title }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
      </div>
      <button onClick={logout} className="btn-secondary text-sm">
        Cerrar sesión
      </button>
    </div>
  );
}
