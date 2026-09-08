import { supabase } from "@/integrations/supabase/client";

/** Klien database dengan tipe longgar agar mudah dipakai lintas tabel. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export type RegStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "rejected"
  | "accepted"
  | "not_accepted"
  | "enrolled";

export const STATUS_LABEL: Record<RegStatus, string> = {
  draft: "Draft",
  submitted: "Diproses",
  verified: "Terverifikasi",
  rejected: "Perlu Perbaikan",
  accepted: "Diterima",
  not_accepted: "Tidak Diterima",
  enrolled: "Daftar Ulang Selesai",
};

export const STATUS_CLASS: Record<RegStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800",
  verified: "bg-sky-100 text-sky-800",
  rejected: "bg-destructive/10 text-destructive",
  accepted: "bg-emerald-100 text-emerald-800",
  not_accepted: "bg-slate-200 text-slate-700",
  enrolled: "bg-primary/10 text-primary",
};

export const DOC_TYPES = [
  { key: "kk", label: "Kartu Keluarga", required: true },
  { key: "akta", label: "Akta Kelahiran", required: true },
  { key: "rapor", label: "Rapor Semester 1-5", required: true },
  { key: "ijazah", label: "Ijazah / SKL", required: false },
  { key: "foto", label: "Pas Foto 3x4", required: true },
  { key: "prestasi", label: "Sertifikat Prestasi", required: false },
] as const;

const wib = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtWIB(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${wib.format(d)} WIB`;
}

export function fmtTanggal(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Ubah nilai timestamp jadi format input datetime-local pada zona WIB. */
export function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Input datetime-local (dianggap WIB) menjadi ISO string UTC. */
export function fromLocalInput(value: string) {
  if (!value) return null;
  return new Date(`${value}:00+07:00`).toISOString();
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export type Jadwal = {
  registration_open_at: string | null;
  registration_close_at: string | null;
  announcement_at: string | null;
  reregistration_close_at: string | null;
  announcement_published: boolean;
};

export function pendaftaranDibuka(s?: Jadwal | null) {
  if (!s) return false;
  const now = Date.now();
  const open = s.registration_open_at ? new Date(s.registration_open_at).getTime() : null;
  const close = s.registration_close_at ? new Date(s.registration_close_at).getTime() : null;
  if (open !== null && now < open) return false;
  if (close !== null && now > close) return false;
  return true;
}

export function pengumumanTerbit(s?: Jadwal | null) {
  if (!s || !s.announcement_published || !s.announcement_at) return false;
  return Date.now() >= new Date(s.announcement_at).getTime();
}

export async function catatAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  detail?: Record<string, unknown>,
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await db.from("audit_logs").insert({
    actor_id: data.user.id,
    actor_email: data.user.email,
    action,
    entity,
    entity_id: entityId ?? null,
    detail: detail ?? null,
  });
}
