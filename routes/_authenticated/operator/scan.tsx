import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import {
  catatAudit,
  db,
  fmtWIB,
  STATUS_CLASS,
  STATUS_LABEL,
  type Jadwal,
  type RegStatus,
} from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/operator/scan")({
  component: ScanPage,
});

type Reg = {
  id: string;
  registration_number: string | null;
  full_name: string | null;
  nisn: string | null;
  status: RegStatus;
  accepted_major_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  enrolled_at: string | null;
};

function ScanPage() {
  const [kode, setKode] = useState("");
  const [cari, setCari] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) {
      setKode(t);
      setCari(t);
    }
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("settings").select("*").maybeSingle();
      return data as Jadwal | null;
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["majors-all-op"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: reg, refetch, isFetching } = useQuery({
    queryKey: ["scan", cari],
    enabled: cari.length > 0,
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select("*")
        .or(`qr_token.eq.${cari},registration_number.eq.${cari}`)
        .maybeSingle();
      return (data ?? null) as Reg | null;
    },
  });

  const batas = settings?.reregistration_close_at
    ? new Date(settings.reregistration_close_at).getTime()
    : null;
  const lewatBatas = batas !== null && Date.now() > batas;

  async function daftarUlang() {
    if (!reg) return;
    if (lewatBatas) {
      toast.error("Batas waktu daftar ulang sudah lewat.");
      return;
    }
    const { error } = await db
      .from("registrations")
      .update({ status: "enrolled", enrolled_at: new Date().toISOString() })
      .eq("id", reg.id);
    if (error) {
      toast.error("Gagal menyimpan daftar ulang.");
      return;
    }
    await catatAudit("daftar_ulang", "registrations", reg.id);
    toast.success("Daftar ulang tercatat.");
    void refetch();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-5" /> Verifikasi Daftar Ulang
          </CardTitle>
          <CardDescription>
            Pindai QR pada kartu peserta menggunakan pemindai/kamera ponsel, atau masukkan kode QR
            maupun nomor pendaftaran secara manual. Batas daftar ulang:{" "}
            {fmtWIB(settings?.reregistration_close_at)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCari(kode.trim());
            }}
          >
            <Input
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Kode QR atau nomor pendaftaran"
              autoFocus
            />
            <Button type="submit">
              <Search className="size-4" /> Cek
            </Button>
          </form>
        </CardContent>
      </Card>

      {isFetching && <p className="text-sm text-muted-foreground">Mencari data…</p>}

      {cari && !isFetching && !reg && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Data tidak ditemukan untuk kode <strong>{cari}</strong>.
        </div>
      )}

      {reg && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardDescription>{reg.registration_number}</CardDescription>
                <CardTitle>{reg.full_name ?? "-"}</CardTitle>
              </div>
              <Badge className={STATUS_CLASS[reg.status]}>{STATUS_LABEL[reg.status]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">NISN</dt>
                <dd className="font-medium">{reg.nisn ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jurusan diterima</dt>
                <dd className="font-medium">
                  {majors?.find((m) => m.id === reg.accepted_major_id)?.name ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Orang tua/wali</dt>
                <dd className="font-medium">{reg.parent_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nomor HP</dt>
                <dd className="font-medium">{reg.parent_phone ?? "-"}</dd>
              </div>
            </dl>

            {reg.status === "enrolled" ? (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="size-4" /> Daftar ulang sudah selesai pada{" "}
                {fmtWIB(reg.enrolled_at)}.
              </p>
            ) : reg.status === "accepted" ? (
              <Button disabled={lewatBatas} onClick={() => void daftarUlang()}>
                <CheckCircle2 className="size-4" /> Tandai Daftar Ulang Selesai
              </Button>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Peserta ini belum berstatus diterima, sehingga belum dapat melakukan daftar ulang.
              </p>
            )}
            {lewatBatas && reg.status === "accepted" && (
              <p className="text-sm text-destructive">
                Batas waktu daftar ulang sudah terlewat. Hubungi panitia untuk penanganan khusus.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
