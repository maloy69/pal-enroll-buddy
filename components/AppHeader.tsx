import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import logoSekolah from "@/assets/logo-smk.webp";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Beranda" },
  { to: "/jurusan", label: "Jurusan" },
  { to: "/alur", label: "Alur Pendaftaran" },
  { to: "/pengumuman", label: "Pengumuman" },
] as const;

export function AppHeader() {
  const { user, isStaff, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <motion.img
            src={logoSekolah}
            alt="Logo SMK Muhammadiyah 1 Paguyangan"
            width={40}
            height={40}
            className="size-10 object-contain"
            initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            whileHover={{ scale: 1.08, rotate: 4 }}
          />
          <motion.span
            className="leading-tight"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            <span className="block text-sm font-bold">SMK Muhammadiyah 1 Paguyangan</span>
            <span className="block text-xs text-muted-foreground">SPMB — Penerimaan Murid Baru</span>
          </motion.span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isStaff && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/operator">Panel Operator</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/pendaftaran-saya">Pendaftaran Anak</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard Saya</Link>
              </Button>

              <Button variant="ghost" size="icon" aria-label="Keluar" onClick={() => void signOut()}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Masuk / Daftar</Link>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Buka menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="size-5" />
        </Button>
      </div>

      <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="menu-mobile"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden border-t bg-background px-4 py-3 md:hidden"
        >
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  Dashboard Saya
                </Link>
                <Link
                  to="/pendaftaran-saya"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  Pendaftaran Anak
                </Link>

                {isStaff && (
                  <Link
                    to="/operator"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    Panel Operator
                  </Link>
                )}
                <button
                  className="rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => void signOut()}
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent"
              >
                Masuk / Daftar
              </Link>
            )}
          </nav>
        </motion.div>
      )}
      </AnimatePresence>
    </header>
  );
}
