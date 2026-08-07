"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearUserSession, getUserInfo } from "@/lib/session";

export default function Navbar() {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#0f0a1f]/80 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-wide text-white">
          ✦ Astro
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/astrologers" className="hover:text-brand-light">Astrologers</Link>
          <Link href="/predictions" className="hover:text-brand-light">Predictions</Link>
          <Link href="/palm-reading" className="hover:text-brand-light">Palm Reading</Link>
          <Link href="/remedies" className="hover:text-brand-light">Remedies</Link>
          <Link href="/wallet" className="hover:text-brand-light">Wallet</Link>
          <Link href="/info" className="hover:text-brand-light">Info</Link>
          {user ? (
            <>
              <span className="text-slate-400">Hi, {user.name}</span>
              <button
                className="btn-secondary !px-3 !py-1.5"
                onClick={() => {
                  clearUserSession();
                  window.location.href = "/";
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-light">Log in</Link>
              <Link href="/signup" className="btn-primary !px-3 !py-1.5">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
