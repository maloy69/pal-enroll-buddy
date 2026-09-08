import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { db, fmtWIB } from "@/lib/spmb";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/operator/audit")({
  component: RiwayatAktivitas,
});

type Log = {
  id: string;
  actor_email: string | null;
  action: string;
  entity: string | null;
  created_at: string;
};

function RiwayatAktivitas() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await db
        .from("audit_logs")
        .select("id,actor_email,action,entity,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      return (data ?? []) as Log[];
    },
  });

  const daftar = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter(
      (l) =>
        !t ||
        l.action.toLowerCase().includes(t) ||
        (l.actor_email ?? "").toLowerCase().includes(t) ||
        (l.entity ?? "").toLowerCase().includes(t),
    );
  }, [data, q]);

  return (
    <div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari aksi, email operator, atau tabel"
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Waktu</th>
              <th className="p-3 font-medium">Oleh</th>
              <th className="p-3 font-medium">Aksi</th>
              <th className="p-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 text-muted-foreground">{fmtWIB(l.created_at)}</td>
                <td className="p-3">{l.actor_email ?? "-"}</td>
                <td className="p-3">
                  <Badge variant="outline">{l.action.replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{l.entity ?? "-"}</td>
              </tr>
            ))}
            {daftar.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted-foreground">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
