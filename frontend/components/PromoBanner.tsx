"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Banner {
  id: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
}

// Autonomously written in-app promo strip - never a real external ad, just
// the promo bot rotating its own copy (see backend promoBot.service.ts).
export default function PromoBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/promo/active")
      .then((d) => setBanner(d.banner))
      .catch(() => {});
  }, []);

  if (!banner || banner.id === dismissedId) return null;

  return (
    <div
      className="text-center px-4 py-2.5 text-sm text-white flex items-center justify-center gap-3 flex-wrap"
      style={{ backgroundImage: "linear-gradient(90deg, #7a1230, #9a1c40, #7a1230)" }}
    >
      <span>{banner.text}</span>
      <Link href={banner.ctaHref} className="font-semibold text-gold underline underline-offset-2 shrink-0">
        {banner.ctaLabel}
      </Link>
      <button
        onClick={() => setDismissedId(banner.id)}
        aria-label="Dismiss"
        className="text-white/60 hover:text-white text-xs shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
