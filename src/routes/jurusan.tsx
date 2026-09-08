import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/spmb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/jurusan")({
  head: () => ({
    meta: [
      { title: "Daftar Jurusan dan Kuota — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        name: "description",
        content:
          "Lihat seluruh jurusan yang dibuka beserta kuota daya tampung pada penerimaan murid baru tahun ini.",
      },
      { property: "og:title", content: "Daftar Jurusan dan Kuota — SPMB SMK Muhammadiyah 1 Paguyangan" },
      {
        property: "og:description",
        content: "Jurusan yang dibuka beserta kuota daya tampungnya.",
      },
    ],
  }),
  component: JurusanPage,
});

type Major = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  quota: number;
  active: boolean;
};

function JurusanPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["majors-all"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("*").eq("active", true).order("code");
      return (data ?? []) as Major[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Jurusan yang Dibuka</h1>
      <p className="mt-2 text-muted-foreground">
        Pilih satu jurusan utama dan satu jurusan cadangan saat mengisi formulir pendaftaran.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat data jurusan…</p>}
        {(data ?? []).map((m) => (
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
        {!isLoading && (data ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2">
            Belum ada jurusan yang dibuka untuk periode ini.
          </div>
        )}
      </div>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link to="/pendaftaran">Daftar Sekarang</Link>
        </Button>
      </div>
    </div>
  );
}
