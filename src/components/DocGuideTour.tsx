import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TourStep = {
  /** Selector CSS elemen yang disorot, mis. [data-tour="panduan"] */
  selector: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

/**
 * Tur on-screen sederhana: overlay gelap dengan "lubang" yang menyorot elemen
 * target, elemen digulir otomatis ke tengah layar, lalu tooltip langkah
 * muncul di dekatnya. Murni React + CSS, tanpa library tambahan.
 */
export function DocGuideTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const ukur = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(steps[idx]?.selector ?? "");
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, idx, steps]);

  // Saat langkah berganti: gulir elemen ke tengah, lalu ukur posisinya.
  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(steps[idx]?.selector ?? "");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(ukur, 350);
    return () => window.clearTimeout(t);
  }, [open, idx, steps, ukur]);

  // Hitung ulang posisi sorotan saat layar digulir/diubah ukurannya.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", ukur);
    window.addEventListener("scroll", ukur, true);
    return () => {
      window.removeEventListener("resize", ukur);
      window.removeEventListener("scroll", ukur, true);
    };
  }, [open, ukur]);

  // Kunci scroll latar & dukung tombol Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const step = steps[idx];
  const terakhir = idx === steps.length - 1;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Posisi tooltip: di bawah sorotan jika muat, kalau tidak di atas; dijepit di dalam layar.
  let tipTop = vh - 220;
  if (rect) {
    const bawah = rect.top + rect.height + PAD + 12;
    tipTop = bawah + 220 < vh ? bawah : Math.max(12, rect.top - PAD - 12 - 220);
  }
  const tipLeft = rect ? Math.min(Math.max(12, rect.left - PAD), Math.max(12, vw - 380)) : 12;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Tutorial unggah dokumen">
      {/* Lapisan gelap dengan lubang sorotan */}
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Tooltip langkah */}
      <div
        className="absolute w-[min(356px,calc(100vw-24px))] rounded-xl border bg-card p-4 shadow-xl transition-all duration-300"
        style={{ top: tipTop, left: tipLeft }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              Langkah {idx + 1} dari {steps.length}
            </p>
            <p className="mt-0.5 font-semibold text-card-foreground">{step?.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tutorial"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{step?.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Lewati
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <Button
              size="sm"
              onClick={() => (terakhir ? onClose() : setIdx((i) => i + 1))}
            >
              {terakhir ? "Selesai" : "Lanjut"} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
