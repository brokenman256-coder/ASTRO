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
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm shadow-orange-900/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-wide text-brand-dark">
          ✦ Astro
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/astrologers" className="hover:text-brand-dark">Astrologers</Link>
          <Link href="/chat" className="hover:text-brand-dark">Chat</Link>
          <Link href="/predictions" className="hover:text-brand-dark">Predictions</Link>
          <Link href="/palm-reading" className="hover:text-brand-dark">Palm Reading</Link>
          <Link href="/remedies" className="hover:text-brand-dark">Remedies</Link>
          <Link href="/wallet" className="hover:text-brand-dark">Wallet</Link>
          <Link href="/info" className="hover:text-brand-dark">Info</Link>
          {user ? (
            <>
              <span className="text-slate-500">Hi, {user.name}</span>
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
              <Link href="/login" className="hover:text-brand-dark">Log in</Link>
              <Link href="/signup" className="btn-primary !px-3 !py-1.5">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
