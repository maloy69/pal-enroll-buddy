import { STATUS_LABEL, type RegStatus } from "@/lib/spmb";

export type RegRow = {
  id: string;
  status: RegStatus;
  gender: string | null;
  previous_school: string | null;
  first_choice_id: string | null;
  accepted_major_id: string | null;
  submitted_at: string | null;
  created_at?: string | null;
};

export type Major = { id: string; code: string; name: string; quota: number };

export function hitungStatus(rows: RegRow[]) {
  const map = new Map<RegStatus, number>();
  for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
  return (Object.keys(STATUS_LABEL) as RegStatus[])
    .filter((s) => s !== "draft")
    .map((s) => ({ status: s, label: STATUS_LABEL[s], total: map.get(s) ?? 0 }))
    .filter((x) => x.total > 0);
}

export function hitungPerJurusan(rows: RegRow[], majors: Major[]) {
  return majors.map((m) => {
    const peminat = rows.filter((r) => r.first_choice_id === m.id).length;
    const diterima = rows.filter((r) => r.accepted_major_id === m.id).length;
    return {
      nama: m.code || m.name,
      namaPanjang: m.name,
      peminat,
      diterima,
      kuota: m.quota,
      sisa: Math.max(0, m.quota - diterima),
    };
  });
}

export function hitungTren(rows: RegRow[], hari = 30) {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" });
  const label = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  });
  const hasil: { tanggal: string; label: string; total: number }[] = [];
  const hitung = new Map<string, number>();
  for (const r of rows) {
    const src = r.submitted_at ?? r.created_at;
    if (!src) continue;
    const d = new Date(src);
    if (Number.isNaN(d.getTime())) continue;
    const key = fmt.format(d);
    hitung.set(key, (hitung.get(key) ?? 0) + 1);
  }
  const now = new Date();
  for (let i = hari - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = fmt.format(d);
    hasil.push({ tanggal: key, label: label.format(d), total: hitung.get(key) ?? 0 });
  }
  return hasil;
}

export function hitungGender(rows: RegRow[]) {
  const l = rows.filter((r) => (r.gender ?? "").toUpperCase().startsWith("L")).length;
  const p = rows.filter((r) => (r.gender ?? "").toUpperCase().startsWith("P")).length;
  const lain = rows.length - l - p;
  return [
    { nama: "Laki-laki", total: l },
    { nama: "Perempuan", total: p },
    ...(lain > 0 ? [{ nama: "Tidak diisi", total: lain }] : []),
  ];
}

export function hitungSekolah(rows: RegRow[], batas = 8) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const nama = (r.previous_school ?? "").trim() || "Tidak diisi";
    map.set(nama, (map.get(nama) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, batas);
}

export function hitungDokumen(
  docs: { doc_type: string; status: "pending" | "approved" | "rejected"; registration_id: string }[],
  jenis: readonly { key: string; label: string }[],
  totalPendaftar: number,
) {
  return jenis.map((t) => {
    const milik = docs.filter((d) => d.doc_type === t.key);
    const disetujui = milik.filter((d) => d.status === "approved").length;
    const menunggu = milik.filter((d) => d.status === "pending").length;
    const ditolak = milik.filter((d) => d.status === "rejected").length;
    return {
      nama: t.label,
      disetujui,
      menunggu,
      ditolak,
      belum: Math.max(0, totalPendaftar - milik.length),
    };
  });
}

export function keCSV(rows: Record<string, unknown>[], kolom: { key: string; label: string }[]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = kolom.map((k) => esc(k.label)).join(";");
  const body = rows.map((r) => kolom.map((k) => esc(r[k.key])).join(";")).join("\n");
  return `${head}\n${body}`;
}

export function unduhCSV(namaFile: string, isi: string) {
  const blob = new Blob([`\uFEFF${isi}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  a.click();
  URL.revokeObjectURL(url);
}
