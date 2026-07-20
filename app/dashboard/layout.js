import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
