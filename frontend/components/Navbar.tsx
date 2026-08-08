"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { clearUserSession, getUserInfo } from "@/lib/session";

const NAV_LINKS = [
  { href: "/astrologers", label: "Astrologers" },
  { href: "/chat", label: "Chat" },
  { href: "/predictions", label: "Predictions" },
  { href: "/kundli", label: "Kundli" },
  { href: "/panchang", label: "Panchang" },
  { href: "/tarot", label: "Tarot" },
  { href: "/palm-reading", label: "Palm Reading" },
  { href: "/remedies", label: "Remedies" },
  { href: "/wallet", label: "Wallet" },
  { href: "/info", label: "Info" },
];

export default function Navbar() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await apiPost("/auth/logout").catch(() => {});
    clearUserSession();
    window.location.href = "/";
  }

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-md border-b border-gold/20 shadow-lg shadow-black/20"
      style={{ backgroundImage: "linear-gradient(120deg, #1e2340, #2a1030 60%, #1e2340)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-wide text-gold-foil">
          ✦ Astro
        </Link>

        <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-200">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gold transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/profile" className="hover:text-gold transition-colors">Hi, {user.name}</Link>
              <button className="btn-secondary !bg-white/10 !text-gold !border-gold/30 hover:!bg-white/20 !px-3 !py-1.5" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gold transition-colors">Log in</Link>
              <Link href="/signup" className="btn-primary !px-3 !py-1.5">Sign up</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 text-xl"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden border-t border-gold/20 px-4 py-3 space-y-1 max-h-[calc(100vh-56px)] overflow-y-auto"
          style={{ backgroundImage: "linear-gradient(120deg, #1e2340, #2a1030 60%, #1e2340)" }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-gold"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-gold/20">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-gold"
                >
                  Profile ({user.name})
                </Link>
                <button className="btn-secondary !bg-white/10 !text-gold !border-gold/30 hover:!bg-white/20 w-full mt-2" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-gold"
                >
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary w-full text-center block mt-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
