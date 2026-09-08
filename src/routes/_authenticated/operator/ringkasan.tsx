import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DOC_TYPES, db, STATUS_LABEL, type RegStatus } from "@/lib/spmb";
import {
  hitungDokumen,
  hitungGender,
  hitungPerJurusan,
  hitungSekolah,
  hitungStatus,
  hitungTren,
  type Major,
  type RegRow,
} from "@/lib/statistik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/operator/ringkasan")({
  component: Ringkasan,
});

const WARNA = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function Ringkasan() {
  const { data: rows } = useQuery({
    queryKey: ["stat-registrations"],
    queryFn: async () => {
      const { data } = await db
        .from("registrations")
        .select(
          "id,status,gender,previous_school,first_choice_id,accepted_major_id,submitted_at,created_at",
        )
        .neq("status", "draft");
      return (data ?? []) as RegRow[];
    },
  });

  const { data: majors } = useQuery({
    queryKey: ["stat-majors"],
    queryFn: async () => {
      const { data } = await db.from("majors").select("id,code,name,quota").eq("active", true);
      return (data ?? []) as Major[];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["stat-docs"],
    queryFn: async () => {
      const { data } = await db.from("documents").select("doc_type,status,registration_id");
      return (data ?? []) as {
        doc_type: string;
        status: "pending" | "approved" | "rejected";
        registration_id: string;
      }[];
    },
  });

  const daftar = rows ?? [];
  const jurusan = useMemo(() => hitungPerJurusan(daftar, majors ?? []), [daftar, majors]);
  const status = useMemo(() => hitungStatus(daftar), [daftar]);
  const tren = useMemo(() => hitungTren(daftar), [daftar]);
  const gender = useMemo(() => hitungGender(daftar), [daftar]);
  const sekolah = useMemo(() => hitungSekolah(daftar), [daftar]);
  const dokumen = useMemo(
    () => hitungDokumen(docs ?? [], DOC_TYPES, daftar.length),
    [docs, daftar.length],
  );

  const jml = (s: RegStatus) => daftar.filter((r) => r.status === s).length;
  const kartu = [
    { label: "Total Pendaftar", nilai: daftar.length },
    { label: STATUS_LABEL["submitted"], nilai: jml("submitted") },
    { label: STATUS_LABEL["verified"], nilai: jml("verified") },
    { label: STATUS_LABEL["accepted"], nilai: jml("accepted") },
    { label: STATUS_LABEL["not_accepted"], nilai: jml("not_accepted") },
    { label: STATUS_LABEL["enrolled"], nilai: jml("enrolled") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kartu.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold">{k.nilai}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Sisa Kuota per Jurusan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {jurusan.map((j) => (
            <div key={j.nama}>
              <div className="flex items-center justify-between text-sm">
                <span>{j.namaPanjang}</span>
                <span className="text-muted-foreground">
                  {j.diterima}/{j.kuota} terisi · sisa {j.sisa}
                </span>
              </div>
              <Progress className="mt-2" value={j.kuota ? (j.diterima / j.kuota) * 100 : 0} />
            </div>
          ))}
          {jurusan.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada jurusan aktif.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Peminat per Jurusan (Pilihan 1)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jurusan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nama" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="peminat" name="Peminat" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="diterima" name="Diterima" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Komposisi Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={status} dataKey="total" nameKey="label" innerRadius={50} outerRadius={85}>
                {status.map((_, i) => (
                  <Cell key={i} fill={WARNA[i % WARNA.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Tren Pendaftaran 30 Hari Terakhir">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tren}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} interval={4} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                name="Pendaftar"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Jenis Kelamin">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gender} dataKey="total" nameKey="nama" outerRadius={85}>
                {gender.map((_, i) => (
                  <Cell key={i} fill={WARNA[i % WARNA.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Asal Sekolah Terbanyak">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sekolah} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="nama" width={120} fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" name="Pendaftar" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Kelengkapan Dokumen">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dokumen}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nama" fontSize={10} interval={0} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="disetujui" name="Disetujui" stackId="d" fill="var(--chart-2)" />
              <Bar dataKey="menunggu" name="Menunggu" stackId="d" fill="var(--chart-4)" />
              <Bar dataKey="ditolak" name="Ditolak" stackId="d" fill="var(--chart-1)" />
              <Bar dataKey="belum" name="Belum diunggah" stackId="d" fill="var(--muted)" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
