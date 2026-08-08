import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Astro - AI Astrology, Palm Reading & Expert Astrologers",
  description: "Astro brings you AI-guided astrology, palm reading, and expert astrologers in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
        <footer className="border-t border-orange-100 mt-20 py-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Astro. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
