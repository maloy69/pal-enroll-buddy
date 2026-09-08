import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, IdCard, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DOC_TYPES, db, fmtWIB, STATUS_CLASS, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/pendaftaran-saya")({
  head: () => ({
    meta: [
      { title: "Pendaftaran Anak Saya — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Daftar pendaftaran anak Anda beserta status terkini dan berkas yang belum dikirim ke sekolah.",
      },
      { property: "og:title", content: "Pendaftaran Anak Saya — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        property: "og:description",
        content: "Pantau status pendaftaran dan berkas yang masih kurang.",
      },
    ],
  }),
  component: PendaftaranSayaPage,
});

type Reg = {
  id: string;
  full_name: string | null;
  registration_number: string | null;
  status: RegStatus;
  submitted_at: string | null;
  created_at: string;
  first_choice_id: string | null;
  verify_note: string | null;
};

type Doc = {
  registration_id: string;
  doc_type: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
};

function PendaftaranSayaPage() {
  const { user } = useAuth();

  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select(
          "id,full_name,registration_number,status,submitted_at,created_at,first_choice_id,verify_note",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Reg[];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["my-all-docs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("documents")
        .select("registration_id,doc_type,status,note")
        .eq("user_id", user!.id);
      return (data ?? []) as Doc[];
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["majors-wali"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold md:text-3xl">Pendaftaran Anak Saya</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Semua pendaftaran atas akun {user?.email}, lengkap dengan status dan berkas yang belum
        dikirim.
      </p>

      {(regs ?? []).length === 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Belum ada pendaftaran</CardTitle>
            <CardDescription>Mulai pendaftaran anak Anda sekarang.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/pendaftaran">
                Mulai Pendaftaran <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-5">
        {(regs ?? []).map((r) => {
          const milik = (docs ?? []).filter((d) => d.registration_id === r.id);
          const kurang = DOC_TYPES.filter(
            (t) => t.required && !milik.some((d) => d.doc_type === t.key),
          );
          const ditolak = milik.filter((d) => d.status === "rejected");
          const opsionalKurang = DOC_TYPES.filter(
            (t) => !t.required && !milik.some((d) => d.doc_type === t.key),
          );
          return (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{r.full_name ?? "Tanpa nama"}</CardTitle>
                    <CardDescription>
                      {r.registration_number
                        ? `No. ${r.registration_number}`
                        : "Nomor terbit setelah berkas dikirim"}{" "}
                      · Pilihan pertama:{" "}
                      {majors?.find((m) => m.id === r.first_choice_id)?.name ?? "-"}
                    </CardDescription>
                  </div>
                  <Badge className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Dikirim: {fmtWIB(r.submitted_at)} · Dibuat: {fmtWIB(r.created_at)}
                </p>

                {r.verify_note && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-destructive">
                    <strong>Catatan operator:</strong> {r.verify_note}
                  </p>
                )}

                {kurang.length === 0 && ditolak.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-800">
                    <CheckCircle2 className="size-4" /> Semua berkas wajib sudah dikirim.
                  </p>
                ) : (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="flex items-center gap-2 font-medium text-amber-900">
                      <AlertTriangle className="size-4" /> Berkas yang belum dikirim / perlu diganti
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                      {kurang.map((t) => (
                        <li key={t.key}>{t.label} — belum diunggah</li>
                      ))}
                      {ditolak.map((d) => (
                        <li key={d.doc_type}>
                          {DOC_TYPES.find((t) => t.key === d.doc_type)?.label ?? d.doc_type} —
                          ditolak{d.note ? `: ${d.note}` : ", harap unggah ulang"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {opsionalKurang.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Berkas tambahan (tidak wajib) yang belum ada:{" "}
                    {opsionalKurang.map((t) => t.label).join(", ")}.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/pendaftaran">
                      <Upload className="size-4" /> Kelola Berkas
                    </Link>
                  </Button>
                  {r.registration_number && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/kartu">
                        <IdCard className="size-4" /> Kartu Peserta
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link to="/dashboard">Lihat Detail</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
