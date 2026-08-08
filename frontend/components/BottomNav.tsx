"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserInfo } from "@/lib/session";

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/astrologers", label: "Astrologers", icon: "☾" },
  { href: "/chat", label: "Chat", icon: "✉" },
  { href: "/predictions", label: "Predictions", icon: "✦" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getUserInfo());
  }, [pathname]);

  const profileItem = loggedIn
    ? { href: "/profile", label: "Profile", icon: "☺" }
    : { href: "/login", label: "Log in", icon: "☺" };

  const allItems = [...ITEMS, profileItem];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-orange-100 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {allItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-brand-dark" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
