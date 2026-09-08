import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { db, fmtWIB, pengumumanTerbit, type Jadwal } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/pengumuman")({
  head: () => ({
    meta: [
      { title: "Pengumuman Hasil Seleksi — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Cek hasil seleksi penerimaan murid baru dengan memasukkan nomor pendaftaran. Hasil terbit sesuai jadwal WIB.",
      },
      { property: "og:title", content: "Pengumuman Hasil Seleksi — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        property: "og:description",
        content: "Cek hasil seleksi dengan nomor pendaftaran Anda.",
      },
    ],
  }),
  component: PengumumanPage,
});

type Hasil = {
  registration_number: string;
  masked_name: string;
  major_code: string | null;
  major_name: string | null;
  rank: number | null;
  total_score: number | null;
  status: string;
};

function PengumumanPage() {
  const [nomor, setNomor] = useState("");
  const [cari, setCari] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as Jadwal | null;
    },
  });

  const terbit = pengumumanTerbit(settings);

  const { data: hasil, isFetching } = useQuery({
    queryKey: ["hasil", cari],
    enabled: terbit && cari.length > 0,
    queryFn: async () => {
      const { data } = await db
        .from("public_results")
        .select("*")
        .eq("registration_number", cari)
        .maybeSingle();
      return data as Hasil | null;
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Pengumuman Hasil Seleksi</h1>
      <p className="mt-2 text-muted-foreground">
        Jadwal pengumuman: <strong>{fmtWIB(settings?.announcement_at)}</strong>
      </p>

      {!terbit ? (
        <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Hasil seleksi belum diumumkan</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman ini akan menampilkan hasil secara otomatis setelah waktu pengumuman tiba dan
            sekolah menerbitkannya.
          </p>
        </div>
      ) : (
        <>
          <form
            className="mt-8 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCari(nomor.trim());
            }}
          >
            <Input
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder="Contoh: 2026-0001"
              aria-label="Nomor pendaftaran"
            />
            <Button type="submit">
              <Search className="size-4" /> Cari
            </Button>
          </form>

          {isFetching && <p className="mt-6 text-sm text-muted-foreground">Mencari…</p>}

          {cari && !isFetching && !hasil && (
            <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nomor pendaftaran <strong>{cari}</strong> tidak ditemukan pada daftar hasil seleksi.
            </div>
          )}

          {hasil && (
            <div className="mt-6 rounded-xl border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{hasil.registration_number}</p>
                  <p className="text-xl font-bold">{hasil.masked_name}</p>
                </div>
                <Badge
                  className={
                    hasil.status === "not_accepted"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-emerald-100 text-emerald-800"
                  }
                >
                  {hasil.status === "not_accepted" ? "Tidak Diterima" : "Diterima"}
                </Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Jurusan</dt>
                  <dd className="font-medium">{hasil.major_name ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Peringkat</dt>
                  <dd className="font-medium">{hasil.rank ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Skor akhir</dt>
                  <dd className="font-medium">{hasil.total_score ?? "-"}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}
