"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminToken } from "@/lib/session";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/astrologers", label: "Astrologers" },
  { href: "/admin/wallet-approvals", label: "Wallet Approvals" },
  { href: "/admin/bot-command", label: "Bot Command Center" },
  { href: "/admin/branding", label: "Branding" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/10 pb-4">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            "text-sm px-3 py-1.5 rounded-lg " +
            (pathname === l.href ? "bg-brand text-white" : "text-slate-400 hover:bg-white/10")
          }
        >
          {l.label}
        </Link>
      ))}
      <button
        className="ml-auto text-sm text-slate-500 hover:text-red-400"
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
