import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/operator")({
  component: OperatorLayout,
});

const TAB = [
  { to: "/operator/ringkasan", label: "Ringkasan", exact: false },
  { to: "/operator", label: "Pendaftar", exact: true },
  { to: "/operator/dokumen", label: "Dokumen", exact: false },
  { to: "/operator/seleksi", label: "Seleksi & Peringkat", exact: false },
  { to: "/operator/hasil", label: "Hasil per Jurusan", exact: false },

  { to: "/operator/pengaturan", label: "Pengaturan", exact: false },
  { to: "/operator/scan", label: "Daftar Ulang", exact: false },
  { to: "/operator/audit", label: "Riwayat Aktivitas", exact: false },
] as const;



function OperatorLayout() {
  const { isStaff, loading, roles } = useAuth();

  if (loading || roles.length === 0) {
    return <div className="px-4 py-16 text-center text-sm text-muted-foreground">Memuat…</div>;
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-muted-foreground">
          Halaman ini khusus operator sekolah. Jika Anda wali murid, gunakan dashboard Anda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/dashboard">Ke Dashboard Saya</Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const { data, error } = await supabase.rpc("claim_first_operator");
              if (error || !data) {
                toast.error("Operator sudah ditetapkan. Minta akses kepada operator sekolah.");
                return;
              }
              toast.success("Anda kini menjadi operator sekolah.");
              window.location.reload();
            }}
          >
            Jadikan saya operator pertama
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tombol di atas hanya berfungsi selama sekolah belum memiliki satu pun operator.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold md:text-3xl">Panel Operator</h1>
      <nav className="mt-4 flex flex-wrap gap-2 border-b pb-3">
        {TAB.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
