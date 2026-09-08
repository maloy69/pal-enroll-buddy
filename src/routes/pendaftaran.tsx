import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  ListChecks,
  Loader2,
  Send,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  DOC_TYPES,
  catatAudit,
  db,
  fmtWIB,
  pendaftaranDibuka,
  STATUS_LABEL,
  type Jadwal,
  type RegStatus,
} from "@/lib/spmb";
import { cariWilayah } from "@/lib/wilayah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentUploader, type DocRow } from "@/components/DocumentUploader";
import { DocGuideTour, type TourStep } from "@/components/DocGuideTour";

export const Route = createFileRoute("/pendaftaran")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Formulir Pendaftaran Murid Baru — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Isi formulir pendaftaran murid baru secara bertahap: data siswa, alamat, sekolah asal, orang tua, pilihan jurusan, dan dokumen.",
      },
      { property: "og:title", content: "Formulir Pendaftaran Murid Baru — SPMB SMK Muhammadiyah 1 Paguyangan" },
      { property: "og:description", content: "Formulir pendaftaran murid baru bertahap." },
    ],
  }),
  component: PendaftaranPage,
});

type Reg = Record<string, string | number | null> & { id: string; status: RegStatus };
type Major = { id: string; code: string; name: string; quota: number };

const LANGKAH = [
  "Data Calon Murid",
  "Alamat Tinggal",
  "Sekolah Asal & Orang Tua",
  "Pilihan Jurusan",
  "Dokumen",
  "Ringkasan",
];

/** Kunci penyimpanan sementara di perangkat untuk pendaftar yang belum masuk. */
const DRAFT_KEY = "spmb-draft";

/** Penanda bahwa tutorial unggah dokumen sudah pernah tampil otomatis. */
const TOUR_KEY = "spmb-tour-docs-seen";

/** Penjelasan singkat tiap dokumen untuk panel panduan. */
const DOC_DESC: Record<string, string> = {
  kk: "Scan atau foto Kartu Keluarga yang masih berlaku.",
  akta: "Scan akta kelahiran, boleh fotokopi yang dilegalisir.",
  rapor: "Scan rapor semester 1–5, pastikan nilai terbaca jelas.",
  ijazah: "Ijazah SMP/MTs atau Surat Keterangan Lulus (SKL).",
  foto: "Pas foto 3×4 berlatar polos, wajah terlihat jelas.",
  prestasi: "Sertifikat kejuaraan atau prestasi, jika ada.",
};

/** Urutan langkah tutorial on-screen di langkah Dokumen. */
const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="panduan"]',
    title: "Baca panduan dulu",
    body: "Panel ini merangkum dokumen yang harus disiapkan, contoh format yang diterima, dan ukuran maksimal berkas.",
  },
  {
    selector: '[data-tour="kartu-dokumen"]',
    title: "Satu kartu, satu dokumen",
    body: "Setiap dokumen punya kartu sendiri. Tanda bintang merah berarti wajib diunggah sebelum pendaftaran bisa dikirim.",
  },
  {
    selector: '[data-tour="pilih-berkas"]',
    title: "Pilih berkas di sini",
    body: "Tekan tombol ini untuk memilih berkas dari HP atau komputer. Foto dari kamera HP otomatis dikecilkan, jadi hampir selalu langsung bisa diunggah.",
  },
  {
    selector: '[data-tour="status-dokumen"]',
    title: "Pantau status berkas",
    body: "Setelah diunggah, status tampil di sini: menunggu verifikasi, disetujui, atau ditolak beserta catatan perbaikannya.",
  },
  {
    selector: '[data-tour="lanjut"]',
    title: "Lanjut ke ringkasan",
    body: "Jika semua dokumen wajib sudah terunggah, tekan Simpan & Lanjut untuk memeriksa ringkasan lalu mengirim pendaftaran.",
  },
];

/** Tutorial versi tamu (belum masuk): tanpa kartu unggahan asli. */
const GUEST_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="panduan"]',
    title: "Baca panduan dulu",
    body: "Panel ini merangkum dokumen yang harus disiapkan, format yang diterima (PDF, PNG, JPG, TIFF), dan ukuran maksimal 2 MB per berkas.",
  },
  {
    selector: '[data-tour="contoh-kartu"]',
    title: "Beginilah tampilan unggahan",
    body: "Setelah masuk, setiap dokumen punya kartu sendiri dengan tombol pilih berkas dan status verifikasi.",
  },
  {
    selector: '[data-tour="masuk"]',
    title: "Masuk dengan Google",
    body: "Untuk mengunggah dokumen dan mengirim pendaftaran, masuk dulu dengan akun Google. Isian formulir Anda tidak hilang.",
  },
];

function bacaDraft(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function simpanDraft(form: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    /* penyimpanan penuh atau ditolak: abaikan */
  }
}

function hapusDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* abaikan */
  }
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function InputTempatLahir({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  const saran = useMemo(() => cariWilayah(value), [value]);
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setBuka(true);
        }}
        onFocus={() => setBuka(true)}
        onBlur={() => window.setTimeout(() => setBuka(false), 120)}
        placeholder="Kota kelahiran"
        autoComplete="off"
      />
      {buka && saran.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {saran.map((nama) => (
            <li key={nama}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(nama);
                  setBuka(false);
                }}
              >
                {nama}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PendaftaranPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(() => bacaDraft());
  const punyaDraftAwal = useRef(Object.keys(bacaDraft()).length > 0);
  const sudahPindah = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as Jadwal | null;
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["majors-active"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("*").eq("active", true).order("code");
      return (data ?? []) as Major[];
    },
  });

  const { data: reg, refetch: refetchReg } = useQuery({
    queryKey: ["my-registration", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (data) return data as Reg;
      const { data: created, error } = await db
        .from("registrations")
        .insert({ user_id: user!.id, parent_email: user!.email })
        .select("*")
        .single();
      if (error) throw error;
      return created as Reg;
    },
  });

  const { data: docs, refetch: refetchDocs } = useQuery({
    queryKey: ["my-docs", reg?.id],
    enabled: !!reg?.id,
    queryFn: async () => {
      const { data } = await db.from("documents").select("*").eq("registration_id", reg!.id);
      return (data ?? []) as DocRow[];
    },
  });

  useEffect(() => {
    if (!reg) return;
    const src = reg as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const k of Object.keys(src)) {
      const v = src[k];
      next[k] = v === null || v === undefined ? "" : String(v);
    }
    setForm((prev) => (Object.keys(prev).length ? prev : next));
  }, [reg]);

  // Selama belum masuk, isian disimpan di perangkat agar tidak hilang.
  useEffect(() => {
    if (user) return;
    if (!Object.keys(form).length) return;
    simpanDraft(form);
  }, [form, user]);

  // Setelah pendaftar punya akun, isian sementara dipindahkan ke data pendaftarannya.
  useEffect(() => {
    if (!user || !reg || sudahPindah.current) return;
    if (!punyaDraftAwal.current) return;
    if (reg.status !== "draft") {
      punyaDraftAwal.current = false;
      hapusDraft();
      return;
    }
    sudahPindah.current = true;
    const draft = bacaDraft();
    const payload: Record<string, string | null> = {};
    FIELDS_BY_STEP.flat().forEach((f) => {
      const v = draft[f];
      if (v !== undefined) payload[f] = v.trim() ? v.trim() : null;
    });
    void (async () => {
      if (Object.keys(payload).length) {
        const { error } = await db.from("registrations").update(payload).eq("id", reg.id);
        if (error) {
          sudahPindah.current = false;
          toast.error("Isian sementara gagal dipindahkan. Silakan coba lagi.");
          return;
        }
      }
      hapusDraft();
      punyaDraftAwal.current = false;
      await refetchReg();
      toast.success("Isian Anda tersimpan di akun. Lanjutkan dengan unggah dokumen.");
      setStep(4);
    })();
  }, [user, reg, refetchReg]);

  // Tawarkan tutorial sekali di langkah Dokumen, baik sudah masuk maupun belum.
  useEffect(() => {
    if (step !== 4) return;
    const masuk = !!user && !!reg;
    const key = masuk ? TOUR_KEY : `${TOUR_KEY}-tamu`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      /* penyimpanan ditolak: tetap tampilkan */
    }
    const t = window.setTimeout(() => setTourOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [step, user, reg]);

  const buka = pendaftaranDibuka(settings);
  const terkunci = !!reg && reg.status !== "draft";

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const docMap = useMemo(() => {
    const m: Record<string, DocRow> = {};
    (docs ?? []).forEach((d) => (m[d.doc_type] = d));
    return m;
  }, [docs]);

  function validasi(s: number) {
    const e: Record<string, string> = {};
    const wajib = (k: string, label: string) => {
      if (!form[k]?.trim()) e[k] = `${label} wajib diisi.`;
    };
    if (s === 0) {
      wajib("full_name", "Nama lengkap");
      if (!/^\d{10}$/.test(form["nisn"] ?? "")) e["nisn"] = "NISN harus 10 digit angka.";
      if (form["nik"] && !/^\d{16}$/.test(form["nik"])) e["nik"] = "NIK harus 16 digit angka.";
      wajib("gender", "Jenis kelamin");
      wajib("birth_place", "Tempat lahir");
      wajib("birth_date", "Tanggal lahir");
    }
    if (s === 1) {
      wajib("address", "Alamat");
      wajib("village", "Kelurahan/Desa");
      wajib("district", "Kecamatan");
      wajib("city", "Kabupaten/Kota");
      wajib("province", "Provinsi");
    }
    if (s === 2) {
      wajib("previous_school", "Asal sekolah");
      wajib("parent_name", "Nama orang tua/wali");
      if (!/^0\d{8,13}$/.test((form["parent_phone"] ?? "").replace(/[\s-]/g, "")))
        e["parent_phone"] = "Nomor HP harus diawali 0 dan 9-14 digit.";
      if (form["parent_email"] && !/^\S+@\S+\.\S+$/.test(form["parent_email"]))
        e["parent_email"] = "Format email tidak valid.";
    }
    if (s === 3) {
      wajib("first_choice_id", "Pilihan pertama");
      if (
        form["second_choice_id"] &&
        form["second_choice_id"] === form["first_choice_id"]
      )
        e["second_choice_id"] = "Pilihan kedua harus berbeda dari pilihan pertama.";
    }
    if (s === 4) {
      DOC_TYPES.filter((d) => d.required).forEach((d) => {
        if (!docMap[d.key]) e[d.key] = `${d.label} wajib diunggah.`;
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const FIELDS_BY_STEP: string[][] = [
    ["full_name", "nisn", "nik", "gender", "birth_place", "birth_date"],
    ["address", "village", "district", "city", "province", "postal_code"],
    [
      "previous_school",
      "graduation_year",
      "parent_name",
      "parent_phone",
      "parent_job",
      "parent_email",
    ],
    ["first_choice_id", "second_choice_id"],
  ];

  async function simpan(s: number) {
    const fields = FIELDS_BY_STEP[s];
    if (!fields) return true;
    if (!user) {
      simpanDraft(form);
      punyaDraftAwal.current = true;
      return true;
    }
    if (!reg) return false;
    const payload: Record<string, string | null> = {};
    fields.forEach((f) => (payload[f] = form[f]?.trim() ? form[f].trim() : null));
    setSaving(true);
    const { error } = await db.from("registrations").update(payload).eq("id", reg.id);
    setSaving(false);
    if (error) {
      toast.error("Data gagal disimpan. Periksa koneksi Anda.");
      return false;
    }
    await refetchReg();
    return true;
  }

  async function lanjut() {
    if (!validasi(step)) {
      toast.error("Ada isian yang perlu diperbaiki.");
      return;
    }
    const ok = await simpan(step);
    if (!ok) return;
    if (!user && step === 3) {
      toast.success("Isian tersimpan di perangkat ini. Lihat dulu panduan unggah dokumen.");
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step < LANGKAH.length - 1) {
      toast.success("Tersimpan. Anda bisa melanjutkan kapan saja.");
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function kirim() {
    for (let s = 0; s <= 4; s++) {
      if (!validasi(s)) {
        setStep(s);
        toast.error("Masih ada data yang belum lengkap.");
        return;
      }
    }
    if (!reg) return;
    setSubmitting(true);
    const { error } = await db
      .from("registrations")
      .update({ status: "submitted" })
      .eq("id", reg.id);
    setSubmitting(false);
    if (error) {
      toast.error("Pengiriman gagal. Silakan coba lagi.");
      return;
    }
    await catatAudit("kirim_pendaftaran", "registrations", reg.id);
    await qc.invalidateQueries({ queryKey: ["my-registration"] });
    toast.success("Pendaftaran terkirim! Bukti pendaftaran siap diunduh.");
    void navigate({ to: "/kartu" });
  }

  if (!buka) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Pendaftaran belum dibuka</h1>
        <p className="mt-3 text-muted-foreground">
          Pendaftaran dibuka {fmtWIB(settings?.registration_open_at)} dan ditutup{" "}
          {fmtWIB(settings?.registration_close_at)}.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Kembali ke beranda</Link>
        </Button>
      </div>
    );
  }

  if (terkunci) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Formulir sudah dikirim</h1>
        <p className="mt-3 text-muted-foreground">
          Status pendaftaran Anda: <strong>{STATUS_LABEL[reg.status]}</strong>. Formulir tidak dapat
          diubah lagi kecuali operator meminta perbaikan.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Lihat Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (user && !reg) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const namaJurusan = (id?: string) => (majors ?? []).find((m) => m.id === id)?.name ?? "-";

  const PanduanPanel = () => (
    <div className="space-y-4 rounded-xl border bg-muted/40 p-4" data-tour="panduan">
      <div>
        <p className="flex items-center gap-2 font-medium">
          <ListChecks className="size-4 text-primary" /> Panduan Unggah Dokumen
        </p>
        <ul className="mt-3 space-y-2">
          {DOC_TYPES.map((d) => (
            <li key={d.key} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  d.required
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {d.required ? "Wajib" : "Opsional"}
              </span>
              <span>
                <span className="font-medium">{d.label}.</span>{" "}
                <span className="text-muted-foreground">{DOC_DESC[d.key]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-3">
          <p className="font-medium">Format yang diterima</p>
          <p className="mt-1 text-muted-foreground">
            PDF, PNG, JPG, atau TIFF. Contoh: hasil scan ijazah biasanya PDF, sedangkan foto
            dokumen dari kamera HP biasanya JPG — keduanya langsung boleh diunggah.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="font-medium">Ukuran maksimal 2 MB per berkas</p>
          <p className="mt-1 text-muted-foreground">
            Foto otomatis dikecilkan menjadi WebP kualitas 50%, jadi hasil foto HP hampir selalu
            bisa diunggah tanpa perlu mengecilkan sendiri.
          </p>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-lg border border-dashed bg-card p-3 text-xs text-muted-foreground">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
        Tips: foto dokumen di tempat terang, posisikan lurus dan tidak miring, pastikan seluruh
        teks terbaca jelas dan tidak buram.
      </p>
    </div>
  );

  const AjakanMasuk = ({ pesan }: { pesan: string }) => (
    <div className="rounded-xl border bg-muted/50 p-5 text-center">
      <p className="text-sm text-muted-foreground">{pesan}</p>
      <Button
        className="mt-4"
        onClick={() => void navigate({ to: "/auth", search: { next: "/pendaftaran" } })}
      >
        Buat Akun / Masuk <ArrowRight className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold md:text-3xl">Formulir Pendaftaran</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Langkah {step + 1} dari {LANGKAH.length} · {LANGKAH[step]}
      </p>

      {!user && (
        <p className="mt-4 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          Isian tersimpan sementara di perangkat ini. Buat akun saat menyimpan agar tidak hilang.
        </p>
      )}

      <ol className="mt-6 flex flex-wrap gap-2">
        {LANGKAH.map((l, i) => (
          <li key={l}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {l}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((step + 1) / LANGKAH.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
        <div>
          <p className="text-sm font-medium">Dokumen persyaratan</p>
          <p className="text-xs text-muted-foreground">
            {user && reg
              ? `${docs?.length ?? 0} dari ${DOC_TYPES.length} berkas sudah diunggah`
              : "Buat akun untuk mulai mengunggah berkas"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!user) {
                void navigate({ to: "/auth", search: { next: "/pendaftaran" } });
                return;
              }
              setStep(4);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <ListChecks className="size-4" /> Panduan dokumen
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!user) {
                void navigate({ to: "/auth", search: { next: "/pendaftaran" } });
                return;
              }
              setStep(4);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Upload className="size-4" /> Unggah Dokumen
          </Button>
        </div>
      </div>



      <div className="mt-8 space-y-5 rounded-xl border bg-card p-5 md:p-6">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nama lengkap calon murid" error={errors["full_name"]}>
                <Input
                  value={form["full_name"] ?? ""}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="Sesuai akta kelahiran"
                  maxLength={100}
                />
              </Field>
            </div>
            <Field label="NISN" error={errors["nisn"]} hint="10 digit angka">
              <Input
                value={form["nisn"] ?? ""}
                onChange={(e) => set("nisn", e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="0000000000"
              />
            </Field>
            <Field label="NIK (opsional)" error={errors["nik"]} hint="16 digit angka">
              <Input
                value={form["nik"] ?? ""}
                onChange={(e) => set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))}
                inputMode="numeric"
                placeholder="0000000000000000"
              />
            </Field>
            <Field label="Jenis kelamin" error={errors["gender"]}>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form["gender"] ?? ""}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Pilih…</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
            <Field
              label="Tempat lahir"
              error={errors["birth_place"]}
              hint="Ketik 3 huruf untuk melihat saran kota/kabupaten"
            >
              <InputTempatLahir
                value={form["birth_place"] ?? ""}
                onChange={(v) => set("birth_place", v)}
              />
            </Field>
            <Field label="Tanggal lahir" error={errors["birth_date"]}>
              <Input
                type="date"
                value={form["birth_date"] ?? ""}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Alamat lengkap" error={errors["address"]}>
                <Textarea
                  value={form["address"] ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW"
                  maxLength={300}
                />
              </Field>
            </div>
            <Field label="Kelurahan/Desa" error={errors["village"]}>
              <Input value={form["village"] ?? ""} onChange={(e) => set("village", e.target.value)} />
            </Field>
            <Field label="Kecamatan" error={errors["district"]}>
              <Input
                value={form["district"] ?? ""}
                onChange={(e) => set("district", e.target.value)}
              />
            </Field>
            <Field label="Kabupaten/Kota" error={errors["city"]}>
              <Input value={form["city"] ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Provinsi" error={errors["province"]}>
              <Input
                value={form["province"] ?? ""}
                onChange={(e) => set("province", e.target.value)}
              />
            </Field>
            <Field label="Kode pos (opsional)">
              <Input
                value={form["postal_code"] ?? ""}
                onChange={(e) => set("postal_code", e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Asal sekolah" error={errors["previous_school"]}>
              <Input
                value={form["previous_school"] ?? ""}
                onChange={(e) => set("previous_school", e.target.value)}
                placeholder="Nama sekolah sebelumnya"
              />
            </Field>
            <Field label="Tahun lulus (opsional)">
              <Input
                value={form["graduation_year"] ?? ""}
                onChange={(e) =>
                  set("graduation_year", e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                placeholder="2026"
              />
            </Field>
            <Field label="Nama orang tua/wali" error={errors["parent_name"]}>
              <Input
                value={form["parent_name"] ?? ""}
                onChange={(e) => set("parent_name", e.target.value)}
              />
            </Field>
            <Field
              label="Nomor HP aktif"
              error={errors["parent_phone"]}
              hint="Dipakai untuk pemberitahuan penting"
            >
              <Input
                value={form["parent_phone"] ?? ""}
                onChange={(e) => set("parent_phone", e.target.value)}
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
              />
            </Field>
            <Field label="Pekerjaan orang tua/wali (opsional)">
              <Input
                value={form["parent_job"] ?? ""}
                onChange={(e) => set("parent_job", e.target.value)}
              />
            </Field>
            <Field label="Email orang tua/wali (opsional)" error={errors["parent_email"]}>
              <Input
                type="email"
                value={form["parent_email"] ?? ""}
                onChange={(e) => set("parent_email", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5">
            <Field label="Pilihan pertama" error={errors["first_choice_id"]}>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form["first_choice_id"] ?? ""}
                onChange={(e) => set("first_choice_id", e.target.value)}
              >
                <option value="">Pilih jurusan…</option>
                {(majors ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} (kuota {m.quota})
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Pilihan kedua (opsional)"
              error={errors["second_choice_id"]}
              hint="Digunakan jika pilihan pertama sudah penuh"
            >
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form["second_choice_id"] ?? ""}
                onChange={(e) => set("second_choice_id", e.target.value)}
              >
                <option value="">Tanpa pilihan kedua</option>
                {(majors ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} (kuota {m.quota})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step >= 4 && (!user || !reg) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Pelajari dulu cara mengunggah dokumen — Anda bisa melihat tutorialnya tanpa masuk.
              </p>
              <Button variant="outline" size="sm" onClick={() => setTourOpen(true)}>
                <CircleHelp className="size-4" /> Lihat Tutorial
              </Button>
            </div>

            <PanduanPanel />

            <div className="rounded-xl border bg-card p-4 opacity-90" data-tour="contoh-kartu">
              <p className="text-sm font-medium">Contoh kartu unggahan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Setelah masuk, tiap dokumen tampil seperti ini lengkap dengan tombol pilih berkas
                dan status verifikasi.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" disabled>
                  Pilih Berkas
                </Button>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  Menunggu verifikasi
                </span>
              </div>
            </div>

            <div data-tour="masuk">
              <AjakanMasuk pesan="Isian Anda sudah tersimpan di perangkat ini. Masuk dengan akun Google untuk mengunggah dokumen dan mengirim pendaftaran." />
            </div>
          </div>
        )}

        {step === 4 && !!user && !!reg && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Siapkan berkas, lalu unggah satu per satu di kartu bawah.
              </p>
              <Button variant="outline" size="sm" onClick={() => setTourOpen(true)}>
                <CircleHelp className="size-4" /> Lihat Tutorial
              </Button>
            </div>

            <PanduanPanel />

            {DOC_TYPES.map((d) => (
              <div key={d.key}>
                <DocumentUploader
                  registrationId={reg.id}
                  userId={user!.id}
                  docType={d.key}
                  label={d.label}
                  required={d.required}
                  existing={docMap[d.key]}
                  locked={false}
                  onChanged={() => void refetchDocs()}
                />
                {errors[d.key] && <p className="mt-1 text-xs text-destructive">{errors[d.key]}</p>}
              </div>
            ))}
          </div>
        )}

        {step === 5 && !!user && !!reg && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold">Periksa kembali data Anda</h2>
              <p className="text-sm text-muted-foreground">
                Setelah dikirim, formulir tidak dapat diubah kecuali operator meminta perbaikan.
              </p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Nama lengkap", form["full_name"]],
                ["NISN", form["nisn"]],
                ["Jenis kelamin", form["gender"] === "L" ? "Laki-laki" : form["gender"] === "P" ? "Perempuan" : "-"],
                ["Tempat, tanggal lahir", `${form["birth_place"] ?? "-"}, ${form["birth_date"] ?? "-"}`],
                ["Alamat", form["address"]],
                ["Kecamatan / Kota", `${form["district"] ?? "-"} / ${form["city"] ?? "-"}`],
                ["Asal sekolah", form["previous_school"]],
                ["Orang tua/wali", form["parent_name"]],
                ["Nomor HP", form["parent_phone"]],
                ["Pilihan pertama", namaJurusan(form["first_choice_id"])],
                ["Pilihan kedua", form["second_choice_id"] ? namaJurusan(form["second_choice_id"]) : "-"],
                ["Dokumen terunggah", `${docs?.length ?? 0} berkas`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium break-words">{(v as string) || "-"}</dd>
                </div>
              ))}
            </dl>
            <Button className="w-full" size="lg" disabled={submitting} onClick={() => void kirim()}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Kirim Pendaftaran
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="size-4" /> Sebelumnya
        </Button>
        <DocGuideTour
          steps={user && reg ? TOUR_STEPS : GUEST_TOUR_STEPS}
          open={tourOpen && step === 4}
          onClose={() => setTourOpen(false)}
        />
        {step < LANGKAH.length - 1 && (step < 4 || (!!user && !!reg)) && (
          <Button data-tour="lanjut" disabled={saving} onClick={() => void lanjut()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {!user && step === 3 ? "Lanjut & Simpan" : "Simpan & Lanjut"}{" "}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
