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
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm shadow-orange-900/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-wide text-brand-dark">
          ✦ Astro
        </Link>

        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-dark">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/profile" className="hover:text-brand-dark">Hi, {user.name}</Link>
              <button className="btn-secondary !px-3 !py-1.5" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-dark">Log in</Link>
              <Link href="/signup" className="btn-primary !px-3 !py-1.5">Sign up</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-orange-50 text-xl"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-orange-100 bg-white px-4 py-3 space-y-1 max-h-[calc(100vh-56px)] overflow-y-auto">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-orange-50 hover:text-brand-dark"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-orange-100">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-orange-50 hover:text-brand-dark"
                >
                  Profile ({user.name})
                </Link>
                <button className="btn-secondary w-full mt-2" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block py-2.5 px-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-orange-50 hover:text-brand-dark"
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
