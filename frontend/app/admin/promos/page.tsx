"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface Settings {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
}

interface Banner {
  id: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
  createdAt: string;
}

export default function PromosPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = getAdminToken();

  async function refresh() {
    const [s, b] = await Promise.all([
      apiGet("/promo/admin/settings", token),
      apiGet("/promo/admin/all", token),
    ]);
    setSettings(s.settings);
    setBanners(b.banners);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleEnabled() {
    if (!settings) return;
    setBusy(true);
    try {
      await apiPost("/promo/admin/settings", { enabled: !settings.enabled }, token);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function updateInterval(minutes: number) {
    setBusy(true);
    try {
      await apiPost("/promo/admin/settings", { intervalMinutes: minutes }, token);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function generateNow() {
    setBusy(true);
    setError("");
    try {
      await apiPost("/promo/admin/generate", undefined, token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBanner(banner: Banner) {
    setBusy(true);
    try {
      await apiPatch(`/promo/admin/${banner.id}`, { active: !banner.active }, token);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">In-app promo banners</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">
        The promo bot autonomously writes and rotates a banner shown site-wide - never a real
        external ad, and never spends real money. Only one banner is active at a time.
      </p>

      {settings && (
        <div className="card p-6 max-w-xl mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autonomous mode</p>
              <p className="text-xs text-slate-500">Generates a fresh banner automatically on this interval.</p>
            </div>
            <button
              onClick={toggleEnabled}
              disabled={busy}
              className={"text-xs px-3 py-1.5 rounded-full border " + (settings.enabled ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}
            >
              {settings.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Interval (minutes)</label>
            <input
              className="input"
              type="number"
              min={5}
              max={1440}
              value={settings.intervalMinutes}
              onChange={(e) => updateInterval(Number(e.target.value))}
            />
          </div>
          {settings.lastRunAt && (
            <p className="text-xs text-slate-400">Last ran {new Date(settings.lastRunAt).toLocaleString()}</p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" onClick={generateNow} disabled={busy}>
            {busy ? "Writing..." : "Generate a banner now"}
          </button>
        </div>
      )}

      <h2 className="font-medium mb-4">Recent banners</h2>
      <div className="space-y-2 max-w-xl">
        {banners.length === 0 && <p className="text-slate-500 text-sm">None generated yet.</p>}
        {banners.map((b) => (
          <div key={b.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-700 truncate">{b.text}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {b.ctaLabel} → {b.ctaHref} · {new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              className={"text-xs px-2 py-1 rounded-full border shrink-0 " + (b.active ? "bg-green-100 text-green-700 border-green-200" : "border-orange-200 text-slate-600")}
              onClick={() => toggleBanner(b)}
              disabled={busy}
            >
              {b.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>
    </AdminGuard>
  );
}
