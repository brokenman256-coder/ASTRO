"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { clearAdminToken } from "@/lib/session";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/astrologers", label: "Aghoris" },
  { href: "/admin/batches", label: "Batches" },
  { href: "/admin/guided-predictions", label: "Guided Predictions" },
  { href: "/admin/live-chats", label: "Live Chats" },
  { href: "/admin/test-chat", label: "Test Chat" },
  { href: "/admin/ai-settings", label: "AI Settings" },
  { href: "/admin/promos", label: "Promo Banners" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/wallet-approvals", label: "Payments" },
  { href: "/admin/password-resets", label: "Password Resets" },
  { href: "/admin/bot-command", label: "Bot Command Center" },
  { href: "/admin/branding", label: "Branding" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiPost("/auth/admin/logout").catch(() => {});
    clearAdminToken();
    router.push("/");
  }

  return (
    <div className="mb-8 -mx-4 -mt-10 px-4 pt-4">
      {/* Distinct dark bar so the admin panel is never mistaken for the
          customer-facing site - this is a completely separate area. */}
      <div className="bg-navy text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙</span>
          <span className="font-display font-semibold tracking-wide">Astro Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-white/70 hover:text-white">
            ← View customer site
          </Link>
          <button className="text-xs text-white/70 hover:text-white" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-orange-100 pb-4">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "text-sm px-3 py-1.5 rounded-lg " +
                (active ? "bg-brand text-white" : "text-slate-500 hover:bg-orange-50")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
