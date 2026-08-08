import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Astro - AI Astrology, Palm Reading & Expert Astrologers",
  description: "Astro brings you AI-guided astrology, palm reading, and expert astrologers in one place.",
};

const FOOTER_LINKS = [
  { href: "/astrologers", label: "Astrologers" },
  { href: "/predictions", label: "Predictions" },
  { href: "/palm-reading", label: "Palm Reading" },
  { href: "/remedies", label: "Remedies" },
  { href: "/info", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-10 pb-24 md:pb-10">{children}</main>
        <BottomNav />
        <footer className="border-t border-orange-100 mt-20 py-10 bg-white pb-24 md:pb-10">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-brand-dark">✦ ASTRO</p>
              <p className="text-xs text-slate-500 mt-1">Your stars, decoded.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              {FOOTER_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-brand-dark">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Astro. All rights reserved. Astrologers on this platform are
            AI personas for entertainment and reflection, not licensed professional advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
