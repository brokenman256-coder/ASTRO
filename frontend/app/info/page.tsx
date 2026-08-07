"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

interface Branding {
  appName: string;
  tagline: string;
  aboutText: string;
}

const CLICKS_NEEDED = 5;
const CLICK_WINDOW_MS = 3000;

export default function InfoPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [clickTimes, setClickTimes] = useState<number[]>([]);
  const [showGate, setShowGate] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet("/branding").then((d) => setBranding(d.branding)).catch(() => {});
  }, []);

  function handleMarkClick() {
    const now = Date.now();
    const recent = [...clickTimes.filter((t) => now - t < CLICK_WINDOW_MS), now];
    setClickTimes(recent);
    if (recent.length >= CLICKS_NEEDED) {
      setClickTimes([]);
      setShowGate(true);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiPost("/auth/admin/gateway", { passphrase });
      sessionStorage.setItem("astro_admin_gateway_token", data.gatewayToken);
      router.push("/admin/gateway");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">{branding?.appName ?? "Astro"}</h1>
        <p className="text-slate-400 mt-2">{branding?.aboutText}</p>
      </div>

      <div className="card p-6 space-y-3 text-sm text-slate-400">
        <p>Astro combines AI-guided astrology, palmistry, and a curated network of astrologers to help you navigate life&apos;s questions.</p>
        <p>Have questions or feedback? Reach out any time - we&apos;re always listening to the stars, and to you.</p>
      </div>

      {showGate && (
        <form onSubmit={handleUnlock} className="card p-6 space-y-3">
          <p className="text-xs text-slate-500">Restricted access</p>
          <input
            className="input"
            type="password"
            placeholder="Enter passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      )}

      {/* Unassuming footer mark - click it a few times quickly to reveal restricted access. */}
      <div className="pt-10 text-center">
        <span
          onClick={handleMarkClick}
          className="select-none text-slate-700 hover:text-slate-600 text-xs cursor-default"
          aria-hidden="true"
        >
          ·
        </span>
      </div>
    </div>
  );
}
