import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, FileText, IdCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  DOC_TYPES,
  db,
  fmtWIB,
  pengumumanTerbit,
  STATUS_CLASS,
  STATUS_LABEL,
  type Jadwal,
  type RegStatus,
} from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/CopyButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Wali Murid — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Pantau status pendaftaran, verifikasi dokumen, hasil seleksi, dan jadwal daftar ulang calon murid baru.",
      },
      { property: "og:title", content: "Dashboard Wali Murid — SPMB SMK Muhammadiyah 1 Paguyangan" },
      { property: "og:description", content: "Pantau status pendaftaran calon murid baru." },
    ],
  }),
  component: DashboardPage,
});

type Reg = {
  id: string;
  status: RegStatus;
  registration_number: string | null;
  full_name: string | null;
  verify_note: string | null;
  submitted_at: string | null;
  total_score: number | null;
  rank: number | null;
  accepted_major_id: string | null;
  enrolled_at: string | null;
};

function DashboardPage() {
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as Jadwal | null;
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

  const { data: docs } = useQuery({
    queryKey: ["my-docs", reg?.id],
    enabled: !!reg?.id,
    queryFn: async () => {
      const { data } = await db
        .from("documents")
        .select("doc_type,status,note")
        .eq("registration_id", reg!.id);
      return (data ?? []) as { doc_type: string; status: string; note: string | null }[];
    },
  });

  const { data: major } = useQuery({
    queryKey: ["major", reg?.accepted_major_id],
    enabled: !!reg?.accepted_major_id,
    queryFn: async () => {
      const { data } = await db
        .from("majors")
        .select("name,code")
        .eq("id", reg!.accepted_major_id)
        .maybeSingle();
      return data as { name: string; code: string } | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const terbit = pengumumanTerbit(settings);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold md:text-3xl">Dashboard Wali Murid</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Masuk sebagai {user?.email}. Pantau seluruh proses pendaftaran dari sini.
      </p>

      {!reg || reg.status === "draft" ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Pendaftaran belum dikirim</CardTitle>
            <CardDescription>
              {reg
                ? "Formulir Anda masih berstatus draft. Lanjutkan pengisian kapan saja."
                : "Anda belum memulai pendaftaran. Mulai sekarang, hanya butuh beberapa menit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/pendaftaran">
                {reg ? "Lanjutkan Pengisian" : "Mulai Pendaftaran"} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mt-8">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardDescription>Nomor pendaftaran</CardDescription>
                  <CardTitle className="text-2xl">{reg.registration_number ?? "-"}</CardTitle>
                </div>
                <Badge className={STATUS_CLASS[reg.status]}>{STATUS_LABEL[reg.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Nama calon murid</dt>
                  <dd className="font-medium">{reg.full_name ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dikirim pada</dt>
                  <dd className="font-medium">{fmtWIB(reg.submitted_at)}</dd>
                </div>
              </dl>
              {reg.verify_note && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <strong>Catatan operator:</strong> {reg.verify_note}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {reg.registration_number && (
                  <CopyButton value={reg.registration_number} label="Salin nomor pendaftaran" />
                )}
                <Button asChild variant="outline" size="sm">
                  <Link to="/kartu">
                    <IdCard className="size-4" /> Kartu Peserta
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/kartu">
                    <Download className="size-4" /> Unduh Bukti (PDF)
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Status Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DOC_TYPES.map((d) => {
                const found = docs?.find((x) => x.doc_type === d.key);
                return (
                  <div
                    key={d.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" /> {d.label}
                    </span>
                    <span className="text-xs">
                      {!found ? (
                        <Badge variant="outline">Belum diunggah</Badge>
                      ) : found.status === "approved" ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Disetujui</Badge>
                      ) : found.status === "rejected" ? (
                        <Badge className="bg-destructive/10 text-destructive">
                          Ditolak{found.note ? `: ${found.note}` : ""}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">Menunggu verifikasi</Badge>
                      )}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Hasil Seleksi</CardTitle>
              <CardDescription>
                Pengumuman dijadwalkan {fmtWIB(settings?.announcement_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!terbit ? (
                <p className="text-sm text-muted-foreground">
                  Hasil seleksi belum diumumkan. Halaman ini akan otomatis diperbarui setelah
                  pengumuman terbit.
                </p>
              ) : reg.status === "accepted" || reg.status === "enrolled" ? (
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-emerald-700">
                    Selamat, calon murid dinyatakan DITERIMA.
                  </p>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Jurusan</dt>
                      <dd className="font-medium">{major?.name ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Peringkat</dt>
                      <dd className="font-medium">{reg.rank ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Skor akhir</dt>
                      <dd className="font-medium">{reg.total_score ?? "-"}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground">
                    Batas daftar ulang: {fmtWIB(settings?.reregistration_close_at)}.{" "}
                    {reg.enrolled_at
                      ? `Daftar ulang selesai pada ${fmtWIB(reg.enrolled_at)}.`
                      : "Bawa kartu peserta ber-QR ke sekolah untuk dipindai petugas."}
                  </p>
                </div>
              ) : reg.status === "not_accepted" ? (
                <p className="text-sm">
                  Mohon maaf, calon murid belum diterima pada seleksi kali ini. Peringkat:{" "}
                  {reg.rank ?? "-"}, skor akhir: {reg.total_score ?? "-"}.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Berkas Anda belum masuk tahap seleksi. Pastikan seluruh dokumen sudah
                  diverifikasi operator.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
