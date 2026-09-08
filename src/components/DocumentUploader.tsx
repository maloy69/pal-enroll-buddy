import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, formatBytes, catatAudit } from "@/lib/spmb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type DocRow = {
  id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
};

const MAX_BYTES = 2 * 1024 * 1024;
const STATUS_TEXT = {
  pending: "Menunggu verifikasi",
  approved: "Disetujui",
  rejected: "Ditolak",
} as const;

/** Format berkas yang boleh diunggah. */
export const TIPE_DIIZINKAN = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/tif",
];
export const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.tif,.tiff,application/pdf,image/png,image/jpeg,image/tiff";
export const TEKS_FORMAT = "PDF, PNG, JPG, TIFF — maks. 2 MB · foto otomatis dikecilkan (WebP)";

function cocokFormat(file: File) {
  if (TIPE_DIIZINKAN.includes(file.type.toLowerCase())) return true;
  return /\.(pdf|png|jpe?g|tiff?)$/i.test(file.name);
}

function berupaGambar(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|tiff?)$/i.test(file.name);
}

/** Gambar apa pun (PNG/JPG/TIFF) diubah ke WebP kualitas 50% agar ukurannya jauh lebih kecil. */
async function keWebp(file: File): Promise<File> {
  if (!berupaGambar(file)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.5));
    if (!blob || blob.type !== "image/webp") return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    // Sebagian peramban tidak bisa membaca TIFF: berkas asli tetap diunggah.
    return file;
  }
}


async function unggahDenganProgress(path: string, file: File, onProgress: (p: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi berakhir, silakan masuk kembali.");
  const base = import.meta.env["VITE_SUPABASE_URL"];
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/dokumen/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Unggahan gagal. Coba lagi."));
    xhr.onerror = () => reject(new Error("Koneksi terputus saat mengunggah."));
    xhr.send(file);
  });
}

export function DocumentUploader({
  registrationId,
  userId,
  docType,
  label,
  required,
  existing,
  locked,
  onChanged,
}: {
  registrationId: string;
  userId: string;
  docType: string;
  label: string;
  required: boolean;
  existing?: DocRow | undefined;
  locked: boolean;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!existing) {
      setPreviewUrl(null);
      return;
    }
    supabase.storage
      .from("dokumen")
      .createSignedUrl(existing.file_path, 3600)
      .then(({ data }) => {
        if (active) setPreviewUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [existing?.file_path, existing]);

  async function handleFile(file: File) {
    if (!cocokFormat(file)) {
      toast.error("Format harus PDF, PNG, JPG, atau TIFF. Lihat panduan unggah di atas.");
      return;
    }
    const asli = file.size;
    const siap = await keWebp(file);
    if (siap.size > MAX_BYTES) {
      toast.error(
        `Ukuran berkas maksimal 2 MB (berkas Anda ${formatBytes(siap.size)}). Lihat panduan unggah di atas.`,
      );
      return;
    }
    setProgress(1);
    try {
      const ext =
        siap.type === "application/pdf"
          ? "pdf"
          : siap.type === "image/webp"
            ? "webp"
            : (siap.name.split(".").pop() ?? "bin").toLowerCase();
      const path = `${userId}/${registrationId}/${docType}.${ext}`;

      await unggahDenganProgress(path, siap, setProgress);
      const { error } = await db.from("documents").upsert(
        {
          registration_id: registrationId,
          user_id: userId,
          doc_type: docType,
          file_path: path,
          file_name: siap.name,
          file_size: siap.size,
          mime_type: siap.type,
          status: "pending",
          note: null,
        },
        { onConflict: "registration_id,doc_type" },
      );
      if (error) throw error;
      await catatAudit("unggah_dokumen", "documents", registrationId, { doc_type: docType });
      toast.success(
        siap.type === "image/webp" && siap.size < asli
          ? `${label} diunggah — dikecilkan dari ${formatBytes(asli)} jadi ${formatBytes(siap.size)}.`
          : `${label} berhasil diunggah.`,
      );

      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah berkas.");
    } finally {
      setProgress(null);
    }
  }

  async function hapus() {
    if (!existing) return;
    await supabase.storage.from("dokumen").remove([existing.file_path]);
    await db.from("documents").delete().eq("id", existing.id);
    toast.success(`${label} dihapus.`);
    onChanged();
  }

  return (
    <div className="rounded-xl border bg-card p-4" data-tour="kartu-dokumen">
      <div className="flex flex-wrap items-start justify-between gap-3" data-tour="status-dokumen">
        <div>
          <p className="font-medium text-card-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </p>
          <p className="text-xs text-muted-foreground">{TEKS_FORMAT}</p>
        </div>
        {existing ? (
          <Badge
            variant="secondary"
            className={
              existing.status === "approved"
                ? "bg-emerald-100 text-emerald-800"
                : existing.status === "rejected"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-100 text-amber-800"
            }
          >
            {STATUS_TEXT[existing.status]}
          </Badge>
        ) : (
          <Badge variant="outline">Belum diunggah</Badge>
        )}
      </div>

      {existing && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          {existing.mime_type?.startsWith("image/") && previewUrl ? (
            <img
              src={previewUrl}
              alt={`Pratinjau ${label}`}
              className="size-14 rounded-md border object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-md border bg-background">
              <FileText className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{existing.file_name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(existing.file_size)}</p>
            {existing.note && (
              <p className="mt-1 text-xs text-destructive">Catatan: {existing.note}</p>
            )}
          </div>
          {previewUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Lihat
              </a>
            </Button>
          )}
        </div>
      )}

      {progress !== null && (
        <div className="mt-3">
          <Progress value={progress} />
          <p className="mt-1 text-xs text-muted-foreground">Mengunggah… {progress}%</p>
        </div>
      )}

      {!locked && (
        <div className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-tour="pilih-berkas"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
          >
            {progress !== null ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {existing ? "Ganti berkas" : "Pilih berkas"}
          </Button>
          {existing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void hapus()}>
              <Trash2 className="size-4" /> Hapus
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
