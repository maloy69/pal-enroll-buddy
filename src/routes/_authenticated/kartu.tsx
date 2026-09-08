import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, Loader2, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db, fmtTanggal, fmtWIB, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import { unduhElemenPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";


export const Route = createFileRoute("/_authenticated/kartu")({
  head: () => ({
    meta: [
      { title: "Kartu Peserta & Bukti Pendaftaran — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Cetak kartu peserta ukuran A4 lengkap dengan kode QR untuk verifikasi daftar ulang di sekolah.",
      },
      { property: "og:title", content: "Kartu Peserta & Bukti Pendaftaran — SPMB SMK Muhammadiyah 1 Paguyangan" },
      { property: "og:description", content: "Kartu peserta ber-QR siap cetak A4." },
    ],
  }),
  component: KartuPage,
});

type Reg = {
  id: string;
  status: RegStatus;
  registration_number: string | null;
  qr_token: string;
  full_name: string | null;
  nisn: string | null;
  birth_place: string | null;
  birth_date: string | null;
  gender: string | null;
  previous_school: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  submitted_at: string | null;
  first_choice_id: string | null;
  second_choice_id: string | null;
};

function KartuPage() {
  const { user } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [unduh, setUnduh] = useState(false);
  const kartuRef = useRef<HTMLDivElement>(null);


  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as { school_name: string; academic_year: string } | null;
    },
  });

  const { data: reg, isLoading } = useQuery({
    queryKey: ["my-registration", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data ?? null) as Reg | null;
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["majors-active"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,code,name");
      return (data ?? []) as { id: string; code: string; name: string }[];
    },
  });

  useEffect(() => {
    if (!reg?.qr_token) return;
    const url = `${window.location.origin}/operator/scan?token=${reg.qr_token}`;
    void QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQr);
  }, [reg?.qr_token]);

  async function unduhPdf() {
    if (!kartuRef.current) return;
    setUnduh(true);
    try {
      const nomor = reg?.registration_number ?? "draft";
      await unduhElemenPdf(kartuRef.current, `Bukti-Pendaftaran-${nomor}.pdf`);
      toast.success("Bukti pendaftaran berhasil diunduh.");
    } catch {
      toast.error("Gagal membuat PDF. Silakan gunakan tombol Cetak A4.");
    } finally {
      setUnduh(false);
    }
  }

  if (isLoading) {

    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reg || reg.status === "draft") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Kartu peserta belum tersedia</h1>
        <p className="mt-3 text-muted-foreground">
          Kartu peserta terbit setelah formulir pendaftaran Anda dikirim.
        </p>
        <Button asChild className="mt-6">
          <Link to="/pendaftaran">Lanjutkan Pendaftaran</Link>
        </Button>
      </div>
    );
  }

  const jur = (id: string | null) => majors?.find((m) => m.id === id)?.name ?? "-";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Kartu Peserta & Bukti Pendaftaran</h1>
          <p className="text-sm text-muted-foreground">
            Unduh PDF atau cetak pada kertas A4, lalu bawa saat verifikasi dan daftar ulang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reg.registration_number && (
            <CopyButton value={reg.registration_number} label="Salin nomor" />
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button variant="outline" disabled={unduh} onClick={() => void unduhPdf()}>
            {unduh ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{" "}
            Unduh PDF
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" /> Cetak A4
          </Button>
        </div>
      </div>

      <div
        ref={kartuRef}
        className="kartu-a4 mt-8 border bg-white p-10 text-slate-900 shadow-sm print:mt-0 print:border-0 print:shadow-none"
      >
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Sistem Penerimaan Murid Baru
            </p>
            <h2 className="text-2xl font-extrabold">{settings?.school_name ?? "SMK Muhammadiyah 1 Paguyangan"}</h2>
            <p className="text-sm">Tahun Ajaran {settings?.academic_year ?? "-"}</p>
          </div>
          {qr && <img src={qr} alt="Kode QR peserta" className="size-28" />}
        </div>

        <h3 className="mt-6 text-center text-lg font-bold uppercase tracking-wide">
          Kartu Peserta Pendaftaran
        </h3>

        <table className="mt-6 w-full text-sm">
          <tbody>
            {[
              ["Nomor Pendaftaran", reg.registration_number ?? "-"],
              ["Nama Calon Murid", reg.full_name ?? "-"],
              ["NISN", reg.nisn ?? "-"],
              [
                "Tempat, Tanggal Lahir",
                `${reg.birth_place ?? "-"}, ${fmtTanggal(reg.birth_date)}`,
              ],
              [
                "Jenis Kelamin",
                reg.gender === "L" ? "Laki-laki" : reg.gender === "P" ? "Perempuan" : "-",
              ],
              ["Asal Sekolah", reg.previous_school ?? "-"],
              ["Pilihan Pertama", jur(reg.first_choice_id)],
              ["Pilihan Kedua", reg.second_choice_id ? jur(reg.second_choice_id) : "-"],
              ["Orang Tua/Wali", reg.parent_name ?? "-"],
              ["Nomor HP", reg.parent_phone ?? "-"],
              ["Waktu Pengiriman", fmtWIB(reg.submitted_at)],
              ["Status Berkas", STATUS_LABEL[reg.status]],
              ["Tanggal Cetak", fmtWIB(new Date().toISOString())],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-slate-200">
                <th className="w-56 py-2 text-left font-medium text-slate-600">{k}</th>
                <td className="py-2 font-semibold">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex items-end justify-between">
          <p className="max-w-sm text-xs text-slate-600">
            Kartu ini sah tanpa tanda tangan basah. Petugas sekolah akan memindai kode QR di atas
            untuk memverifikasi keaslian data dan proses daftar ulang.
          </p>
          <div className="text-center text-xs text-slate-600">
            <p>Panitia SPMB</p>
            <div className="mt-12 w-48 border-t border-slate-400 pt-1">{settings?.school_name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
