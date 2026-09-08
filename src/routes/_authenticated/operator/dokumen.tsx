import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DOC_TYPES, catatAudit, db, fmtWIB, formatBytes } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/operator/dokumen")({
  component: DaftarDokumen,
});

type DocItem = {
  id: string;
  registration_id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
};

type RegLite = {
  id: string;
  full_name: string | null;
  registration_number: string | null;
};

const STATUS_TEXT = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
} as const;

const STATUS_CLASS = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-destructive/10 text-destructive",
} as const;

function labelJenis(key: string) {
  return DOC_TYPES.find((d) => d.key === key)?.label ?? key;
}

function DaftarDokumen() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [jenis, setJenis] = useState("all");

  const { data: docs, refetch } = useQuery({
    queryKey: ["op-all-docs"],
    queryFn: async () => {
      const { data } = await db
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as DocItem[];
    },
  });

  const { data: regs } = useQuery({
    queryKey: ["op-regs-lite"],
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select("id,full_name,registration_number");
      return (data ?? []) as RegLite[];
    },
  });

  const regMap = useMemo(() => {
    const m: Record<string, RegLite> = {};
    (regs ?? []).forEach((r) => (m[r.id] = r));
    return m;
  }, [regs]);

  const daftar = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (docs ?? []).filter((d) => {
      const r = regMap[d.registration_id];
      const okStatus = status === "all" || d.status === status;
      const okJenis = jenis === "all" || d.doc_type === jenis;
      const okCari =
        !t ||
        (r?.full_name ?? "").toLowerCase().includes(t) ||
        (r?.registration_number ?? "").toLowerCase().includes(t) ||
        (d.file_name ?? "").toLowerCase().includes(t);
      return okStatus && okJenis && okCari;
    });
  }, [docs, regMap, q, status, jenis]);

  async function bukaBerkas(path: string) {
    const { data } = await supabase.storage.from("dokumen").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Berkas tidak dapat dibuka.");
  }

  async function ubahDoc(doc: DocItem, next: DocItem["status"], note?: string) {
    const { error } = await db
      .from("documents")
      .update({ status: next, note: note ?? null })
      .eq("id", doc.id);
    if (error) {
      toast.error("Gagal memperbarui berkas.");
      return;
    }
    await catatAudit("verifikasi_dokumen", "documents", doc.id, { status: next });
    toast.success(`Berkas ditandai ${STATUS_TEXT[next].toLowerCase()}.`);
    void refetch();
  }

  const jumlah = (s: DocItem["status"]) => (docs ?? []).filter((d) => d.status === s).length;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <div key={s} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{STATUS_TEXT[s]}</p>
            <p className="text-2xl font-bold">{jumlah(s)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama pendaftar, nomor, atau nama berkas"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
        >
          <option value="all">Semua jenis</option>
          {DOC_TYPES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Pendaftar</th>
              <th className="p-3 font-medium">Jenis Dokumen</th>
              <th className="p-3 font-medium">Berkas</th>
              <th className="p-3 font-medium">Diunggah</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {daftar.map((d) => {
              const r = regMap[d.registration_id];
              return (
                <tr key={d.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-medium">{r?.full_name ?? "Tanpa nama"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r?.registration_number ?? "Belum bernomor"}
                    </p>
                  </td>
                  <td className="p-3">{labelJenis(d.doc_type)}</td>
                  <td className="p-3">
                    <p className="max-w-56 truncate">{d.file_name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(d.file_size)}
                      {d.mime_type === "image/webp" ? " · WebP" : ""}
                    </p>
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtWIB(d.created_at)}</td>
                  <td className="p-3">
                    <Badge className={STATUS_CLASS[d.status]}>{STATUS_TEXT[d.status]}</Badge>
                    {d.note && <p className="mt-1 text-xs text-destructive">{d.note}</p>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => void bukaBerkas(d.file_path)}>
                      Lihat
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void ubahDoc(d, "approved")}>
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const note = window.prompt("Alasan penolakan berkas ini?");
                        if (note !== null) void ubahDoc(d, "rejected", note);
                      }}
                    >
                      <XCircle className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {daftar.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  Belum ada dokumen yang cocok dengan pencarian ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
