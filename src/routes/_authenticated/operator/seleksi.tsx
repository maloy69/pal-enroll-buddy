import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Play, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catatAudit, db, fmtWIB, STATUS_CLASS, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/operator/seleksi")({
  component: SeleksiPage,
});

type Row = {
  id: string;
  registration_number: string | null;
  full_name: string | null;
  status: RegStatus;
  total_score: number | null;
  rank: number | null;
  accepted_major_id: string | null;
};

function SeleksiPage() {
  const [running, setRunning] = useState(false);

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as { announcement_at: string | null; announcement_published: boolean } | null;
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["majors-all-op"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,code,name,quota");
      return (data ?? []) as { id: string; code: string; name: string; quota: number }[];
    },
  });

  const { data: rows, refetch } = useQuery({
    queryKey: ["ranking"],
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select("id,registration_number,full_name,status,total_score,rank,accepted_major_id")
        .in("status", ["verified", "accepted", "not_accepted", "enrolled"])
        .order("rank", { ascending: true, nullsFirst: false });
      return (data ?? []) as Row[];
    },
  });

  async function jalankan() {
    setRunning(true);
    const { data, error } = await supabase.rpc("run_selection");
    setRunning(false);
    if (error) {
      toast.error("Proses seleksi gagal dijalankan.");
      return;
    }
    toast.success(`Seleksi selesai. ${data ?? 0} calon murid dinyatakan diterima.`);
    void refetch();
  }

  async function toggleTerbit(publish: boolean) {
    const { error } = await db
      .from("settings")
      .update({ announcement_published: publish })
      .eq("id", true);
    if (error) {
      toast.error("Gagal memperbarui pengumuman.");
      return;
    }
    await catatAudit("pengumuman", "settings", null, { published: publish });
    toast.success(publish ? "Pengumuman diterbitkan." : "Pengumuman ditarik kembali.");
    void refetchSettings();
  }

  const diterima = (rows ?? []).filter((r) => r.status === "accepted" || r.status === "enrolled");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proses Seleksi</CardTitle>
          <CardDescription>
            Skor dihitung dari nilai tiap kriteria dikali bobotnya, lalu peserta ditempatkan sesuai
            urutan skor dan sisa kuota jurusan pilihannya.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button disabled={running} onClick={() => void jalankan()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Jalankan Seleksi
          </Button>
          <Button
            variant={settings?.announcement_published ? "outline" : "default"}
            onClick={() => void toggleTerbit(!settings?.announcement_published)}
          >
            <Megaphone className="size-4" />
            {settings?.announcement_published ? "Tarik Pengumuman" : "Terbitkan Pengumuman"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Jadwal tampil publik: {fmtWIB(settings?.announcement_at)}
            {settings?.announcement_published ? " · sudah diterbitkan" : " · belum diterbitkan"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {(majors ?? []).map((m) => {
          const terisi = diterima.filter((r) => r.accepted_major_id === m.id).length;
          return (
            <div key={m.id} className="rounded-xl border p-4">
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="mt-1 text-2xl font-bold">
                {terisi}
                <span className="text-base font-normal text-muted-foreground"> / {m.quota}</span>
              </p>
              <p className="text-xs text-muted-foreground">kursi terisi</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Peringkat</th>
              <th className="p-3 font-medium">No. Pendaftaran</th>
              <th className="p-3 font-medium">Nama</th>
              <th className="p-3 font-medium">Skor</th>
              <th className="p-3 font-medium">Jurusan Diterima</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.rank ?? "-"}</td>
                <td className="p-3 font-medium">{r.registration_number}</td>
                <td className="p-3">{r.full_name ?? "-"}</td>
                <td className="p-3">{r.total_score ?? "-"}</td>
                <td className="p-3">
                  {majors?.find((m) => m.id === r.accepted_major_id)?.name ?? "-"}
                </td>
                <td className="p-3">
                  <Badge className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  Belum ada berkas terverifikasi yang bisa diseleksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
