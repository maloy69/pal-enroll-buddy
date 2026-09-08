import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { catatAudit, db, STATUS_CLASS, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/operator/hasil")({
  component: HasilPage,
});

type Major = {
  id: string;
  code: string;
  name: string;
  quota: number;
  min_exam_score: number;
  min_diploma_score: number;
  exam_criteria_id: string | null;
  diploma_criteria_id: string | null;
};
type Kriteria = { id: string; code: string; name: string; weight: number; max_value: number };
type Reg = {
  id: string;
  registration_number: string | null;
  full_name: string | null;
  previous_school: string | null;
  status: RegStatus;
  first_choice_id: string | null;
  second_choice_id: string | null;
  accepted_major_id: string | null;
  rank: number | null;
  total_score: number | null;
  submitted_at: string | null;
};
type Nilai = { registration_id: string; criteria_id: string; value: number };

const BISA_SELEKSI: RegStatus[] = ["submitted", "verified", "accepted", "not_accepted", "enrolled"];

function HasilPage() {
  const [majorId, setMajorId] = useState<string>("");
  const [sibuk, setSibuk] = useState(false);

  const { data: majors } = useQuery({
    queryKey: ["majors-hasil"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,code,name,quota").eq("active", true).order("code");
      return (data ?? []) as Major[];
    },
  });

  const { data: kriteria } = useQuery({
    queryKey: ["kriteria-hasil"],
    queryFn: async () => {
      const { data } = await db
        .from("criteria")
        .select("id,code,name,weight,max_value")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as Kriteria[];
    },
  });

  const { data: regs, refetch } = useQuery({
    queryKey: ["regs-hasil"],
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select(
          "id,registration_number,full_name,previous_school,status,first_choice_id,second_choice_id,accepted_major_id,rank,total_score,submitted_at",
        )
        .in("status", BISA_SELEKSI)
        .order("submitted_at", { ascending: true });
      return (data ?? []) as Reg[];
    },
  });

  const { data: nilai, refetch: refetchNilai } = useQuery({
    queryKey: ["nilai-hasil"],
    queryFn: async () => {
      const { data } = await db.from("registration_scores").select("registration_id,criteria_id,value");
      return (data ?? []) as Nilai[];
    },
  });

  const aktif = majorId || majors?.[0]?.id || "";
  const jurusan = (majors ?? []).find((m) => m.id === aktif);

  const skor = useMemo(() => {
    const per: Record<string, number> = {};
    const totalBobot = (kriteria ?? []).reduce((a, c) => a + Number(c.weight), 0);
    for (const r of regs ?? []) {
      let s = 0;
      for (const c of kriteria ?? []) {
        const n = (nilai ?? []).find((v) => v.registration_id === r.id && v.criteria_id === c.id);
        if (!n) continue;
        s += (Number(n.value) / (Number(c.max_value) || 1)) * Number(c.weight);
      }
      per[r.id] = totalBobot > 0 ? Math.round(s * 1000) / 1000 : 0;
    }
    return per;
  }, [regs, kriteria, nilai]);

  const peserta = useMemo(() => {
    if (!aktif) return [];
    return (regs ?? [])
      .filter(
        (r) =>
          r.first_choice_id === aktif || r.second_choice_id === aktif || r.accepted_major_id === aktif,
      )
      .map((r) => ({ ...r, skor: skor[r.id] ?? 0, pilihan: r.first_choice_id === aktif ? 1 : 2 }))
      .sort(
        (a, b) =>
          b.skor - a.skor ||
          a.pilihan - b.pilihan ||
          (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""),
      );
  }, [regs, aktif, skor]);

  const diterima = peserta.filter(
    (r) => r.accepted_major_id === aktif && (r.status === "accepted" || r.status === "enrolled"),
  ).length;
  const sisa = Math.max(0, (jurusan?.quota ?? 0) - diterima);

  async function tetapkan(id: string, terima: boolean, nilaiSkor: number) {
    setSibuk(true);
    const payload = terima
      ? { status: "accepted", accepted_major_id: aktif, total_score: nilaiSkor }
      : { status: "not_accepted", accepted_major_id: null, total_score: nilaiSkor };
    const { error } = await db.from("registrations").update(payload).eq("id", id);
    setSibuk(false);
    if (error) {
      toast.error("Gagal menyimpan keputusan.");
      return;
    }
    await catatAudit(terima ? "terima_pendaftar" : "tolak_pendaftar", "registrations", id, {
      jurusan: jurusan?.name ?? null,
    });
    toast.success(terima ? "Pendaftar dinyatakan diterima." : "Pendaftar dinyatakan tidak diterima.");
    void refetch();
  }

  async function isiNilai(regId: string, criteriaId: string, value: number) {
    const ada = (nilai ?? []).find((v) => v.registration_id === regId && v.criteria_id === criteriaId);
    const { error } = ada
      ? await db
          .from("registration_scores")
          .update({ value })
          .eq("registration_id", regId)
          .eq("criteria_id", criteriaId)
      : await db.from("registration_scores").insert({
          registration_id: regId,
          criteria_id: criteriaId,
          value,
        });
    if (error) {
      toast.error("Nilai gagal disimpan.");
      return;
    }
    void refetchNilai();
  }

  async function otomatis() {
    if (!jurusan) return;
    setSibuk(true);
    const kuota = jurusan.quota;
    let ke = 0;
    for (const p of peserta) {
      const terima = ke < kuota;
      if (terima) ke += 1;
      await db
        .from("registrations")
        .update(
          terima
            ? {
                status: "accepted",
                accepted_major_id: aktif,
                total_score: p.skor,
                rank: ke,
              }
            : { status: "not_accepted", accepted_major_id: null, total_score: p.skor },
        )
        .eq("id", p.id);
    }
    setSibuk(false);
    await catatAudit("tetapkan_hasil_jurusan", "majors", aktif, { diterima: ke });
    toast.success(`${ke} pendaftar diterima di ${jurusan.name}.`);
    void refetch();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasil Seleksi per Jurusan</CardTitle>
          <CardDescription>
            Skor dihitung dari kriteria aktif beserta bobotnya. Anda bisa mengisi nilai langsung di
            tabel, menetapkan hasil satu per satu, atau menetapkan otomatis sesuai kuota jurusan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(majors ?? []).map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={m.id === aktif ? "default" : "outline"}
                onClick={() => setMajorId(m.id)}
              >
                {m.code} · {m.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              Kuota <strong>{jurusan?.quota ?? 0}</strong>
            </span>
            <span>
              Diterima <strong>{diterima}</strong>
            </span>
            <span>
              Sisa kursi <strong>{sisa}</strong>
            </span>
            <span className="text-muted-foreground">Peminat: {peserta.length}</span>
            <Button size="sm" disabled={sibuk || !peserta.length} onClick={() => void otomatis()}>
              {sibuk ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Tetapkan Otomatis Sesuai Kuota
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(kriteria ?? []).map((c) => (
              <Badge key={c.id} variant="outline">
                {c.name} · bobot {c.weight} · maks {c.max_value}
              </Badge>
            ))}
            {(kriteria ?? []).length === 0 && (
              <span>Belum ada kriteria aktif. Atur dulu di tab Pengaturan.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">#</th>
              <th className="p-3 font-medium">No. Pendaftaran</th>
              <th className="p-3 font-medium">Nama</th>
              <th className="p-3 font-medium">Pilihan</th>
              {(kriteria ?? []).map((c) => (
                <th key={c.id} className="p-3 font-medium">
                  {c.code}
                </th>
              ))}
              <th className="p-3 font-medium">Skor</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Keputusan</th>
            </tr>
          </thead>
          <tbody>
            {peserta.map((r, i) => (
              <tr key={r.id} className={`border-t ${i < (jurusan?.quota ?? 0) ? "bg-emerald-50/50" : ""}`}>
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium">{r.registration_number ?? "-"}</td>
                <td className="p-3">
                  {r.full_name ?? "-"}
                  <span className="block text-xs text-muted-foreground">{r.previous_school ?? "-"}</span>
                </td>
                <td className="p-3">{r.pilihan === 1 ? "Pertama" : "Kedua"}</td>
                {(kriteria ?? []).map((c) => {
                  const n = (nilai ?? []).find(
                    (v) => v.registration_id === r.id && v.criteria_id === c.id,
                  );
                  return (
                    <td key={c.id} className="p-2">
                      <Input
                        className="h-8 w-20"
                        type="number"
                        min={0}
                        max={c.max_value}
                        defaultValue={n ? String(n.value) : ""}
                        aria-label={`Nilai ${c.name} untuk ${r.full_name ?? "pendaftar"}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (e.target.value === "" || Number.isNaN(v)) return;
                          void isiNilai(r.id, c.id, v);
                        }}
                      />
                    </td>
                  );
                })}
                <td className="p-3 font-semibold">{r.skor.toFixed(2)}</td>
                <td className="p-3">
                  <Badge className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sibuk}
                      onClick={() => void tetapkan(r.id, true, r.skor)}
                    >
                      <CheckCircle2 className="size-4 text-emerald-600" /> Terima
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sibuk}
                      onClick={() => void tetapkan(r.id, false, r.skor)}
                    >
                      <XCircle className="size-4 text-destructive" /> Tolak
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {peserta.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted-foreground">
                  Belum ada pendaftar yang memilih jurusan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
