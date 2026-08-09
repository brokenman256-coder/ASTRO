"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import PromoBanner from "@/components/PromoBanner";

const FOOTER_LINKS = [
  { href: "/astrologers", label: "Aghoris" },
  { href: "/predictions", label: "Predictions" },
  { href: "/palm-reading", label: "Palm Reading" },
  { href: "/remedies", label: "Remedies" },
  { href: "/info", label: "About" },
];

// Admin pages are a completely separate provision from the customer site -
// they get their own AdminNav (see components/AdminNav.tsx) and must never
// show the customer login/signup nav, bottom tab bar, or footer, which was
// previously rendering on every /admin/* page too and made it unclear
// whether you were looking at the customer site or the admin panel.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <PromoBanner />
      <main className="max-w-6xl mx-auto px-4 py-10 pb-24 md:pb-10">{children}</main>
      <BottomNav />
      <footer
        className="border-t border-gold/20 mt-20 py-10 pb-24 md:pb-10"
        style={{ backgroundImage: "linear-gradient(120deg, #1e2340, #2a1030 60%, #1e2340)" }}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-display text-lg font-bold text-gold-foil">✦ ASTRO</p>
            <p className="text-xs text-slate-400 mt-1">Your stars, decoded.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-300">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-gold transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Astro. All rights reserved. Aghoris on this platform are
          AI personas for entertainment and reflection, not licensed professional advice.
        </p>
      </footer>
    </>
  );
}
