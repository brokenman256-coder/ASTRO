"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminToken } from "@/lib/session";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/astrologers", label: "Astrologers" },
  { href: "/admin/guided-predictions", label: "Guided Predictions" },
  { href: "/admin/ai-settings", label: "AI Settings" },
  { href: "/admin/wallet-approvals", label: "Payments" },
  { href: "/admin/bot-command", label: "Bot Command Center" },
  { href: "/admin/branding", label: "Branding" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-orange-100 pb-4">
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
      <button
        className="ml-auto text-sm text-slate-500 hover:text-red-600"
        onClick={() => {
          clearAdminToken();
          router.push("/");
        }}
      >
        Log out
      </button>
    </div>
  );
}
