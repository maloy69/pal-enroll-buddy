import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catatAudit, db, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RegForm = Record<string, string | null>;

const KOSONG: RegForm = {
  full_name: "",
  nisn: "",
  nik: "",
  gender: "L",
  birth_place: "",
  birth_date: "",
  address: "",
  village: "",
  district: "",
  city: "",
  province: "",
  postal_code: "",
  previous_school: "",
  graduation_year: "",
  parent_name: "",
  parent_phone: "",
  parent_job: "",
  parent_email: "",
  first_choice_id: "",
  second_choice_id: "",
  status: "submitted",
  verify_note: "",
};

const STATUS_PILIHAN: RegStatus[] = [
  "submitted",
  "verified",
  "rejected",
  "accepted",
  "not_accepted",
  "enrolled",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function RegistrationForm({
  open,
  onOpenChange,
  awal,
  majors,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  awal: (RegForm & { id?: string }) | null;
  majors: { id: string; code: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RegForm & { id?: string }>({ ...KOSONG, ...(awal ?? {}) });
  const [saving, setSaving] = useState(false);
  const editing = Boolean(awal?.id);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function simpan() {
    if (!(form["full_name"] ?? "").trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const k of Object.keys(KOSONG)) {
      const v = form[k];
      payload[k] = v === "" ? null : v;
    }
    payload["status"] = form["status"] ?? "submitted";

    if (editing) {
      const { error } = await db.from("registrations").update(payload).eq("id", form.id);
      setSaving(false);
      if (error) {
        toast.error("Gagal menyimpan perubahan.");
        return;
      }
      await catatAudit("ubah_data_pendaftar", "registrations", form.id, { oleh: "operator" });
      toast.success("Data pendaftar diperbarui.");
    } else {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setSaving(false);
        toast.error("Sesi berakhir, silakan masuk kembali.");
        return;
      }
      payload["user_id"] = auth.user.id;
      const { data, error } = await db.from("registrations").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        toast.error("Gagal menambah pendaftar.");
        return;
      }
      await catatAudit("tambah_pendaftar", "registrations", data?.id, { oleh: "operator" });
      toast.success("Pendaftar baru ditambahkan.");
    }
    onOpenChange(false);
    onSaved();
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pendaftar" : "Tambah Pendaftar"}</DialogTitle>
          <DialogDescription>
            Isi data pendaftar. Nomor pendaftaran dibuat otomatis saat status bukan draft.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama lengkap">
            <Input value={form["full_name"] ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="NISN">
            <Input value={form["nisn"] ?? ""} onChange={(e) => set("nisn", e.target.value)} />
          </Field>
          <Field label="NIK">
            <Input value={form["nik"] ?? ""} onChange={(e) => set("nik", e.target.value)} />
          </Field>
          <Field label="Jenis kelamin">
            <select
              className={selectClass}
              value={form["gender"] ?? "L"}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label="Tempat lahir">
            <Input value={form["birth_place"] ?? ""} onChange={(e) => set("birth_place", e.target.value)} />
          </Field>
          <Field label="Tanggal lahir">
            <Input
              type="date"
              value={form["birth_date"] ?? ""}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Alamat">
              <Textarea
                rows={2}
                value={form["address"] ?? ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Desa/Kelurahan">
            <Input value={form["village"] ?? ""} onChange={(e) => set("village", e.target.value)} />
          </Field>
          <Field label="Kecamatan">
            <Input value={form["district"] ?? ""} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="Kabupaten/Kota">
            <Input value={form["city"] ?? ""} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Provinsi">
            <Input value={form["province"] ?? ""} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="Kode pos">
            <Input value={form["postal_code"] ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
          </Field>
          <Field label="Asal sekolah">
            <Input
              value={form["previous_school"] ?? ""}
              onChange={(e) => set("previous_school", e.target.value)}
            />
          </Field>
          <Field label="Tahun lulus">
            <Input
              value={form["graduation_year"] ?? ""}
              onChange={(e) => set("graduation_year", e.target.value)}
            />
          </Field>
          <Field label="Nama orang tua/wali">
            <Input value={form["parent_name"] ?? ""} onChange={(e) => set("parent_name", e.target.value)} />
          </Field>
          <Field label="No. HP orang tua">
            <Input value={form["parent_phone"] ?? ""} onChange={(e) => set("parent_phone", e.target.value)} />
          </Field>
          <Field label="Pekerjaan orang tua">
            <Input value={form["parent_job"] ?? ""} onChange={(e) => set("parent_job", e.target.value)} />
          </Field>
          <Field label="Email orang tua">
            <Input value={form["parent_email"] ?? ""} onChange={(e) => set("parent_email", e.target.value)} />
          </Field>
          <Field label="Pilihan 1">
            <select
              className={selectClass}
              value={form["first_choice_id"] ?? ""}
              onChange={(e) => set("first_choice_id", e.target.value)}
            >
              <option value="">— pilih —</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pilihan 2">
            <select
              className={selectClass}
              value={form["second_choice_id"] ?? ""}
              onChange={(e) => set("second_choice_id", e.target.value)}
            >
              <option value="">— pilih —</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={selectClass}
              value={form["status"] ?? "submitted"}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUS_PILIHAN.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Catatan verifikasi (opsional)">
              <Textarea
                rows={2}
                value={form["verify_note"] ?? ""}
                onChange={(e) => set("verify_note", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void simpan()} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
