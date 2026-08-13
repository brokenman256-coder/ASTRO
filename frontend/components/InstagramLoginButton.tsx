"use client";

import { useEffect, useState } from "react";
import { API_URL, apiGet } from "@/lib/api";

export default function InstagramLoginButton({ label = "Continue with Instagram" }: { label?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet("/auth/instagram/config")
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  function start() {
    window.location.href = `${API_URL}/auth/instagram`;
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={enabled === false}
        className="w-full rounded-full px-5 py-2.5 font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #f58529, #dd2a7b 45%, #8134af 75%, #515bd4)" }}
      >
        {enabled === null ? "Checking Instagram…" : label}
      </button>
      {enabled === false && (
        <p className="text-xs text-slate-500 mt-2 text-center">
          Instagram login is not configured on this server yet.
        </p>
      )}
    </div>
  );
}
