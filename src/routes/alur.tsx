import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DOC_TYPES } from "@/lib/spmb";

export const Route = createFileRoute("/alur")({
  head: () => ({
    meta: [
      { title: "Alur dan Syarat Pendaftaran — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Enam langkah pendaftaran murid baru: masuk akun, isi formulir, unggah dokumen, verifikasi, pengumuman, dan daftar ulang.",
      },
      { property: "og:title", content: "Alur dan Syarat Pendaftaran — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        property: "og:description",
        content: "Panduan lengkap tahapan pendaftaran murid baru daring.",
      },
    ],
  }),
  component: AlurPage,
});

const LANGKAH = [
  {
    t: "Masuk dengan akun Google",
    d: "Wali murid membuat akun sekali saja. Data pendaftaran otomatis tersimpan di akun tersebut.",
  },
  {
    t: "Isi formulir bertahap",
    d: "Data calon murid, alamat, sekolah asal, orang tua, dan pilihan jurusan. Bisa disimpan lalu dilanjutkan.",
  },
  {
    t: "Unggah dokumen",
    d: "Format PDF, PNG, atau JPG maksimal 2 MB per berkas. Gambar besar otomatis dikompres tanpa mengurangi keterbacaan.",
  },
  {
    t: "Verifikasi operator",
    d: "Operator sekolah memeriksa berkas. Jika ada yang kurang, Anda akan melihat catatan perbaikan di dashboard.",
  },
  {
    t: "Seleksi dan pengumuman",
    d: "Penilaian memakai kriteria dan bobot yang ditetapkan sekolah. Hasil terbit otomatis sesuai jadwal.",
  },
  {
    t: "Daftar ulang",
    d: "Cetak kartu peserta ber-QR, lalu tunjukkan di sekolah untuk dipindai petugas saat daftar ulang.",
  },
];

function AlurPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Alur Pendaftaran</h1>
      <p className="mt-2 text-muted-foreground">
        Ikuti enam langkah berikut. Anda dapat berhenti kapan saja dan melanjutkan nanti.
      </p>

      <ol className="mt-8 space-y-4">
        {LANGKAH.map((l, i) => (
          <li key={l.t} className="flex gap-4 rounded-xl border bg-card p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{l.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{l.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-2xl font-bold">Dokumen yang Disiapkan</h2>
      <ul className="mt-4 space-y-2">
        {DOC_TYPES.map((d) => (
          <li key={d.key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>{d.label}</span>
            <span className={d.required ? "font-medium text-primary" : "text-muted-foreground"}>
              {d.required ? "Wajib" : "Opsional"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link to="/pendaftaran">Mulai Sekarang</Link>
        </Button>
      </div>
    </div>
  );
}
