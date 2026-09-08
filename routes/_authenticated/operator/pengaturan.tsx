import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { catatAudit, db, fromLocalInput, toLocalInput } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/operator/pengaturan")({
  component: PengaturanPage,
});

type Major = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  quota: number;
  active: boolean;
};
type Criteria = {
  id: string;
  code: string;
  name: string;
  weight: number;
  max_value: number;
  active: boolean;
  sort_order: number;
};

function PengaturanPage() {
  const [jadwal, setJadwal] = useState<Record<string, string>>({});
  const [profil, setProfil] = useState<Record<string, string>>({});

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as Record<string, string | null> | null;
    },
  });

  const { data: majors, refetch: refetchMajors } = useQuery({
    queryKey: ["majors-all-op"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("*").order("code");
      return (data ?? []) as Major[];
    },
  });

  const { data: criteria, refetch: refetchCriteria } = useQuery({
    queryKey: ["criteria-all"],
    queryFn: async () => {
      const { data } = await db.from("criteria").select("*").order("sort_order");
      return (data ?? []) as Criteria[];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setJadwal({
      registration_open_at: toLocalInput(settings["registration_open_at"]),
      registration_close_at: toLocalInput(settings["registration_close_at"]),
      announcement_at: toLocalInput(settings["announcement_at"]),
      reregistration_close_at: toLocalInput(settings["reregistration_close_at"]),
    });
    setProfil({
      school_name: settings["school_name"] ?? "",
      academic_year: settings["academic_year"] ?? "",
      contact_phone: settings["contact_phone"] ?? "",
      contact_email: settings["contact_email"] ?? "",
      address: settings["address"] ?? "",
    });
  }, [settings]);

  const totalBobot = (criteria ?? [])
    .filter((c) => c.active)
    .reduce((a, c) => a + Number(c.weight), 0);

  async function simpanJadwal() {
    const open = fromLocalInput(jadwal["registration_open_at"] ?? "");
    const close = fromLocalInput(jadwal["registration_close_at"] ?? "");
    if (open && close && new Date(close) <= new Date(open)) {
      toast.error("Waktu penutupan harus setelah waktu pembukaan.");
      return;
    }
    const { error } = await db
      .from("settings")
      .update({
        ...profil,
        registration_open_at: open,
        registration_close_at: close,
        announcement_at: fromLocalInput(jadwal["announcement_at"] ?? ""),
        reregistration_close_at: fromLocalInput(jadwal["reregistration_close_at"] ?? ""),
      })
      .eq("id", true);
    if (error) {
      toast.error("Gagal menyimpan pengaturan.");
      return;
    }
    await catatAudit("ubah_pengaturan", "settings", null);
    toast.success("Pengaturan tersimpan.");
    void refetchSettings();
  }

  async function simpanJurusan(m: Major) {
    const { error } = await db
      .from("majors")
      .update({
        code: m.code,
        name: m.name,
        description: m.description,
        quota: m.quota,
        active: m.active,
      })
      .eq("id", m.id);
    if (error) toast.error("Gagal menyimpan jurusan.");
    else {
      toast.success("Jurusan diperbarui.");
      void refetchMajors();
    }
  }

  async function tambahJurusan() {
    const code = window.prompt("Kode jurusan baru (contoh: TBSM)");
    if (!code) return;
    const name = window.prompt("Nama lengkap jurusan");
    if (!name) return;
    const { error } = await db.from("majors").insert({ code: code.toUpperCase(), name, quota: 0 });
    if (error) toast.error("Kode jurusan sudah dipakai atau tidak valid.");
    else void refetchMajors();
  }

  async function hapusJurusan(id: string) {
    if (!window.confirm("Hapus jurusan ini?")) return;
    const { error } = await db.from("majors").delete().eq("id", id);
    if (error) toast.error("Jurusan tidak bisa dihapus karena sudah dipilih pendaftar.");
    else void refetchMajors();
  }

  async function simpanKriteria(c: Criteria) {
    const { error } = await db
      .from("criteria")
      .update({ name: c.name, weight: c.weight, max_value: c.max_value, active: c.active })
      .eq("id", c.id);
    if (error) toast.error("Gagal menyimpan kriteria.");
    else {
      toast.success("Kriteria diperbarui.");
      void refetchCriteria();
    }
  }

  async function tambahKriteria() {
    const code = window.prompt("Kode kriteria (contoh: TAHFIDZ)");
    if (!code) return;
    const name = window.prompt("Nama kriteria");
    if (!name) return;
    const { error } = await db
      .from("criteria")
      .insert({ code: code.toUpperCase(), name, weight: 0, max_value: 100, sort_order: 99 });
    if (error) toast.error("Kode kriteria sudah dipakai.");
    else void refetchCriteria();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identitas & Jadwal (WIB)</CardTitle>
          <CardDescription>
            Semua waktu di bawah ini dibaca sebagai Waktu Indonesia Barat.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nama sekolah</Label>
            <Input
              value={profil["school_name"] ?? ""}
              onChange={(e) => setProfil({ ...profil, school_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tahun ajaran</Label>
            <Input
              value={profil["academic_year"] ?? ""}
              onChange={(e) => setProfil({ ...profil, academic_year: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telepon panitia</Label>
            <Input
              value={profil["contact_phone"] ?? ""}
              onChange={(e) => setProfil({ ...profil, contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email panitia</Label>
            <Input
              value={profil["contact_email"] ?? ""}
              onChange={(e) => setProfil({ ...profil, contact_email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Alamat sekolah</Label>
            <Textarea
              value={profil["address"] ?? ""}
              onChange={(e) => setProfil({ ...profil, address: e.target.value })}
            />
          </div>
          {[
            ["registration_open_at", "Pendaftaran dibuka"],
            ["registration_close_at", "Pendaftaran ditutup"],
            ["announcement_at", "Pengumuman hasil"],
            ["reregistration_close_at", "Batas daftar ulang"],
          ].map(([k, l]) => (
            <div key={k} className="space-y-1.5">
              <Label>{l}</Label>
              <Input
                type="datetime-local"
                value={jadwal[k!] ?? ""}
                onChange={(e) => setJadwal({ ...jadwal, [k!]: e.target.value })}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button onClick={() => void simpanJadwal()}>
              <Save className="size-4" /> Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Jurusan & Kuota</CardTitle>
              <CardDescription>Atur daya tampung tiap jurusan.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => void tambahJurusan()}>
              <Plus className="size-4" /> Tambah Jurusan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(majors ?? []).map((m) => (
            <BarisJurusan
              key={m.id}
              data={m}
              onSave={simpanJurusan}
              onDelete={() => void hapusJurusan(m.id)}
            />
          ))}
          {(majors ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada jurusan.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Kriteria & Bobot Penilaian</CardTitle>
              <CardDescription>
                Total bobot aktif saat ini: <strong>{totalBobot}</strong> (disarankan 100).
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => void tambahKriteria()}>
              <Plus className="size-4" /> Tambah Kriteria
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(criteria ?? []).map((c) => (
            <BarisKriteria key={c.id} data={c} onSave={simpanKriteria} />
          ))}
          {(criteria ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada kriteria penilaian.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BarisJurusan({
  data,
  onSave,
  onDelete,
}: {
  data: Major;
  onSave: (m: Major) => Promise<void>;
  onDelete: () => void;
}) {
  const [m, setM] = useState(data);
  useEffect(() => setM(data), [data]);
  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[100px_1fr_110px_auto_auto] sm:items-center">
      <Input value={m.code} onChange={(e) => setM({ ...m, code: e.target.value.toUpperCase() })} />
      <Input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
      <Input
        type="number"
        min={0}
        value={m.quota}
        onChange={(e) => setM({ ...m, quota: Number(e.target.value) })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={m.active}
          onChange={(e) => setM({ ...m, active: e.target.checked })}
        />
        Aktif
      </label>
      <div className="flex gap-1">
        <Button size="sm" onClick={() => void onSave(m)}>
          <Save className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function BarisKriteria({
  data,
  onSave,
}: {
  data: Criteria;
  onSave: (c: Criteria) => Promise<void>;
}) {
  const [c, setC] = useState(data);
  useEffect(() => setC(data), [data]);
  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_100px_auto_auto] sm:items-center">
      <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      <div>
        <Input
          type="number"
          min={0}
          value={c.weight}
          onChange={(e) => setC({ ...c, weight: Number(e.target.value) })}
          aria-label="Bobot"
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground">Bobot</p>
      </div>
      <div>
        <Input
          type="number"
          min={1}
          value={c.max_value}
          onChange={(e) => setC({ ...c, max_value: Number(e.target.value) })}
          aria-label="Nilai maksimum"
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground">Nilai maks</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={c.active}
          onChange={(e) => setC({ ...c, active: e.target.checked })}
        />
        Aktif
      </label>
      <Button size="sm" onClick={() => void onSave(c)}>
        <Save className="size-4" />
      </Button>
    </div>
  );
}
