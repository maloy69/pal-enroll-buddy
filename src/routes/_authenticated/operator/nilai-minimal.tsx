import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { catatAudit, db } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/operator/nilai-minimal")({
  component: NilaiMinimalPage,
});

type Kriteria = { id: string; code: string; name: string; max_value: number };
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

type Draft = Record<
  string,
  { min_exam_score: string; min_diploma_score: string; exam_criteria_id: string; diploma_criteria_id: string }
>;

function NilaiMinimalPage() {
  const [draft, setDraft] = useState<Draft>({});
  const [sibuk, setSibuk] = useState<string | null>(null);

  const { data: kriteria } = useQuery({
    queryKey: ["kriteria-minimal"],
    queryFn: async () => {
      const { data } = await db
        .from("criteria")
        .select("id,code,name,max_value")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as Kriteria[];
    },
  });

  const { data: majors, refetch } = useQuery({
    queryKey: ["majors-minimal"],
    queryFn: async () => {
      const { data } = await db
        .from("majors")
        .select(
          "id,code,name,quota,min_exam_score,min_diploma_score,exam_criteria_id,diploma_criteria_id",
        )
        .eq("active", true)
        .order("code");
      return (data ?? []) as Major[];
    },
  });

  useEffect(() => {
    if (!majors) return;
    setDraft(
      Object.fromEntries(
        majors.map((m) => [
          m.id,
          {
            min_exam_score: String(Number(m.min_exam_score ?? 0)),
            min_diploma_score: String(Number(m.min_diploma_score ?? 0)),
            exam_criteria_id: m.exam_criteria_id ?? "",
            diploma_criteria_id: m.diploma_criteria_id ?? "",
          },
        ]),
      ),
    );
  }, [majors]);

  function ubah(id: string, key: keyof Draft[string], value: string) {
    setDraft((d) => ({ ...d, [id]: { ...d[id]!, [key]: value } }));
  }

  async function simpan(m: Major) {
    const d = draft[m.id];
    if (!d) return;
    setSibuk(m.id);
    const { error } = await db
      .from("majors")
      .update({
        min_exam_score: Number(d.min_exam_score) || 0,
        min_diploma_score: Number(d.min_diploma_score) || 0,
        exam_criteria_id: d.exam_criteria_id || null,
        diploma_criteria_id: d.diploma_criteria_id || null,
      })
      .eq("id", m.id);
    setSibuk(null);
    if (error) {
      toast.error("Gagal menyimpan nilai minimal.");
      return;
    }
    await catatAudit("ubah_nilai_minimal", "majors", m.id, {
      minimal_ujian: Number(d.min_exam_score) || 0,
      minimal_ijazah: Number(d.min_diploma_score) || 0,
    });
    toast.success(`Nilai minimal ${m.name} tersimpan.`);
    void refetch();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nilai Minimal per Jurusan</CardTitle>
          <CardDescription>
            Tentukan nilai ujian dan nilai ijazah paling rendah yang boleh diterima di tiap jurusan.
            Saat hasil seleksi ditetapkan otomatis, pendaftar yang nilainya di bawah batas ini
            langsung dinyatakan tidak diterima meski kuota masih tersedia.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(majors ?? []).map((m) => {
            const d = draft[m.id];
            if (!d) return null;
            return (
              <div key={m.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {m.code} · {m.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Kuota {m.quota} kursi</p>
                  </div>
                  <Button size="sm" disabled={sibuk === m.id} onClick={() => void simpan(m)}>
                    {sibuk === m.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Simpan
                  </Button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`ujian-${m.id}`}>Nilai minimal ujian</Label>
                    <Input
                      id={`ujian-${m.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={d.min_exam_score}
                      onChange={(e) => ubah(m.id, "min_exam_score", e.target.value)}
                    />
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      aria-label={`Kriteria nilai ujian ${m.name}`}
                      value={d.exam_criteria_id}
                      onChange={(e) => ubah(m.id, "exam_criteria_id", e.target.value)}
                    >
                      <option value="">— pilih kriteria nilai ujian —</option>
                      {(kriteria ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (maks {Number(c.max_value)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ijazah-${m.id}`}>Nilai minimal ijazah</Label>
                    <Input
                      id={`ijazah-${m.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={d.min_diploma_score}
                      onChange={(e) => ubah(m.id, "min_diploma_score", e.target.value)}
                    />
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      aria-label={`Kriteria nilai ijazah ${m.name}`}
                      value={d.diploma_criteria_id}
                      onChange={(e) => ubah(m.id, "diploma_criteria_id", e.target.value)}
                    >
                      <option value="">— pilih kriteria nilai ijazah —</option>
                      {(kriteria ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (maks {Number(c.max_value)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {(majors ?? []).length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada jurusan aktif. Tambahkan dulu di tab Pengaturan.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
