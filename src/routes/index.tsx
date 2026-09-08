import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-spmb.jpg";
import logoSekolah from "@/assets/logo-smk.webp";
import { db, fmtWIB, pendaftaranDibuka, type Jadwal } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPMB SMK Muhammadiyah 1 Paguyangan — Pendaftaran Murid Baru" },
      {
        name: "description",
        content:
          "Daftar murid baru secara daring: isi formulir bertahap, unggah dokumen, pantau seleksi, dan cetak kartu peserta ber-QR.",
      },
      { property: "og:title", content: "SPMB SMK Muhammadiyah 1 Paguyangan — Pendaftaran Murid Baru" },
      {
        property: "og:description",
        content: "Pendaftaran murid baru daring yang mudah, cepat, dan transparan.",
      },
    ],
  }),
  component: Beranda,
});

type Major = { id: string; code: string; name: string; description: string | null; quota: number };

function Beranda() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as (Jadwal & { school_name: string; academic_year: string }) | null;
    },
  });
  const { data: majors } = useQuery({
    queryKey: ["majors-active"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("*").eq("active", true).order("code");
      return (data ?? []) as Major[];
    },
  });

  const buka = pendaftaranDibuka(settings);
  const totalKuota = (majors ?? []).reduce((a, m) => a + (m.quota ?? 0), 0);

  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.img
              src={logoSekolah}
              alt="Logo SMK Muhammadiyah 1 Paguyangan"
              width={72}
              height={72}
              className="mb-4 size-18 object-contain"
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            />
            <Badge variant={buka ? "default" : "secondary"} className="mb-4">
              {buka ? "Pendaftaran sedang dibuka" : "Pendaftaran belum dibuka"}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Pendaftaran Murid Baru {settings?.academic_year ?? ""}
            </h1>
            <p className="mt-2 text-lg font-semibold text-primary">
              {settings?.school_name ?? "SMK Muhammadiyah 1 Paguyangan"}
            </p>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              Satu akun untuk semua proses: isi formulir bertahap, unggah dokumen, pantau hasil
              seleksi, sampai cetak kartu peserta. Semua bisa dikerjakan dari rumah.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/pendaftaran">
                  Mulai Pendaftaran <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/alur">Lihat Alur Pendaftaran</Link>
              </Button>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Jurusan</dt>
                <dd className="text-2xl font-bold">{majors?.length ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Total kuota</dt>
                <dd className="text-2xl font-bold">{totalKuota || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Biaya formulir</dt>
                <dd className="text-2xl font-bold">Gratis</dd>
              </div>
            </dl>
          </motion.div>
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            <img
              src={heroImg}
              alt="Calon murid baru berseragam di halaman sekolah"
              width={1600}
              height={1000}
              className="w-full rounded-2xl border object-cover shadow-xl"
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Jadwal Penting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seluruh waktu mengikuti Waktu Indonesia Barat (WIB).
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pendaftaran dibuka", value: settings?.registration_open_at },
            { label: "Pendaftaran ditutup", value: settings?.registration_close_at },
            { label: "Pengumuman hasil", value: settings?.announcement_at },
            { label: "Batas daftar ulang", value: settings?.reregistration_close_at },
          ].map((j) => (
            <Card key={j.label}>
              <CardHeader className="pb-2">
                <CalendarClock className="size-5 text-primary" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {j.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{fmtWIB(j.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold">Kenapa mendaftar di sini mudah?</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                title: "Formulir bertahap",
                desc: "Isi sedikit demi sedikit. Data tersimpan otomatis, bisa dilanjutkan kapan saja.",
              },
              {
                icon: FileCheck2,
                title: "Unggah dokumen aman",
                desc: "Format PDF/PNG/JPG dengan pratinjau, indikator kemajuan, dan status verifikasi.",
              },
              {
                icon: QrCode,
                title: "Kartu peserta ber-QR",
                desc: "Cetak kartu ukuran A4 dan tunjukkan QR saat daftar ulang di sekolah.",
              },
              {
                icon: Users,
                title: "Pilihan jurusan ganda",
                desc: "Ajukan pilihan pertama dan cadangan sesuai minat calon murid.",
              },
              {
                icon: ShieldCheck,
                title: "Data terlindungi",
                desc: "Hanya Anda dan operator sekolah yang dapat melihat berkas pendaftaran.",
              },
              {
                icon: CalendarClock,
                title: "Pengumuman terjadwal",
                desc: "Hasil seleksi terbit otomatis sesuai jadwal yang ditetapkan sekolah.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5">
                <f.icon className="size-6 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">Pilihan Jurusan</h2>
          <Button asChild variant="ghost">
            <Link to="/jurusan">
              Selengkapnya <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(majors ?? []).map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{m.name}</span>
                  <Badge variant="outline">{m.code}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{m.description}</p>
                <p className="mt-3 text-sm font-medium">Kuota: {m.quota} murid</p>
              </CardContent>
            </Card>
          ))}
          {majors?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada jurusan yang dibuka. Silakan cek kembali nanti.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
