"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  bio: string;
  photoUrl: string;
  active: boolean;
  source: "MANUAL" | "BOT";
}

interface SchedulerSettings {
  enabled: boolean;
  intervalMinutes: number;
  maxActiveAstrologers: number;
  dailyDisplayCount: number;
  lastRunAt: string | null;
}

export default function AdminAstrologersPage() {
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", specialty: "", experienceYears: "5", bio: "" });
  const [scheduler, setScheduler] = useState<SchedulerSettings | null>(null);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [bulkCount, setBulkCount] = useState("1000");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const token = getAdminToken();

  async function refresh() {
    const data = await apiGet("/astrologers/admin/all", token);
    setAstrologers(data.astrologers);
  }

  async function refreshScheduler() {
    const data = await apiGet("/astrologers/admin/bot/settings", token);
    setScheduler(data.settings);
  }

  useEffect(() => {
    refresh();
    refreshScheduler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveScheduler(next: Partial<SchedulerSettings>) {
    if (!scheduler) return;
    setSchedulerSaving(true);
    try {
      const data = await apiPost("/astrologers/admin/bot/settings", next, token);
      setScheduler(data.settings);
    } finally {
      setSchedulerSaving(false);
    }
  }

  async function runBotAdd() {
    setBusy(true);
    try {
      const data = await apiPost("/astrologers/admin/bot/add", undefined, token);
      setMessage(data.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runBotPrune() {
    setBusy(true);
    try {
      const data = await apiPost("/astrologers/admin/bot/prune", { maxToRetire: 1 }, token);
      setMessage(data.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runBulkSeed() {
    const count = parseInt(bulkCount, 10) || 0;
    if (count < 1) return;
    if (!confirm(`Create ${count} astrologer profiles now? This uses placeholder avatars (no AI image cost) and can't be undone in bulk - you'd have to retire them one by one.`)) {
      return;
    }
    setBusy(true);
    try {
      const data = await apiPost("/astrologers/admin/bot/bulk-seed", { count }, token);
      setMessage(data.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost(
        "/astrologers/admin",
        { ...form, experienceYears: parseInt(form.experienceYears, 10) },
        token
      );
      setForm({ name: "", specialty: "", experienceYears: "5", bio: "" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRetire(id: string) {
    setBusy(true);
    try {
      await apiDelete(`/astrologers/admin/${id}`, token);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Astrologer roster</h1>
      <p className="text-slate-400 text-sm mb-6">
        Use the bot to automatically add fresh astrologer profiles or retire stale/low-rated ones -
        just like a live astrology marketplace rotates its roster.
      </p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary" onClick={runBotAdd} disabled={busy}>
          🤖 Bot: Add new astrologer
        </button>
        <button className="btn-secondary" onClick={runBotPrune} disabled={busy}>
          🤖 Bot: Retire lowest-rated
        </button>
      </div>
      {message && <p className="text-sm text-brand-light mb-6">{message}</p>}

      <div className="card p-6 mb-8 space-y-3">
        <h2 className="font-medium">Bulk-generate astrologers</h2>
        <p className="text-xs text-slate-500">
          One-time bulk creation, not the live per-interval bot - uses placeholder avatars (no AI
          image cost) so you can build a large, varied pool cheaply. Combine with the "Featured
          per day" setting below so only a rotating subset shows to users at once.
        </p>
        <div className="flex gap-3">
          <input
            className="input max-w-[160px]"
            type="number"
            min={1}
            max={2000}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
          />
          <button className="btn-primary" onClick={runBulkSeed} disabled={busy}>
            Generate
          </button>
        </div>
      </div>

      {scheduler && (
        <div className="card p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">Auto-bot (runs on a schedule)</h2>
              <p className="text-xs text-slate-500 mt-1">
                When on, the bot adds a new astrologer every {scheduler.intervalMinutes} minute
                {scheduler.intervalMinutes === 1 ? "" : "s"} on its own, generating an AI headshot
                if <code className="text-slate-400">OPENAI_API_KEY</code> is configured. It retires
                the weakest profile first if the roster is at its cap, so the list stays bounded.
              </p>
            </div>
            <button
              className={scheduler.enabled ? "btn-primary" : "btn-secondary"}
              onClick={() => saveScheduler({ enabled: !scheduler.enabled })}
              disabled={schedulerSaving}
            >
              {scheduler.enabled ? "On" : "Off"}
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Interval (minutes)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={1440}
                value={scheduler.intervalMinutes}
                onChange={(e) => setScheduler({ ...scheduler, intervalMinutes: Number(e.target.value) })}
                onBlur={() => saveScheduler({ intervalMinutes: scheduler.intervalMinutes })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Max active roster size</label>
              <input
                className="input"
                type="number"
                min={1}
                max={5000}
                value={scheduler.maxActiveAstrologers}
                onChange={(e) => setScheduler({ ...scheduler, maxActiveAstrologers: Number(e.target.value) })}
                onBlur={() => saveScheduler({ maxActiveAstrologers: scheduler.maxActiveAstrologers })}
              />
              <p className="text-[11px] text-slate-600 mt-1">
                Raise this before bulk-generating, or the auto-bot will retire your bulk pool down to this size.
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Featured per day</label>
              <input
                className="input"
                type="number"
                min={1}
                max={5000}
                value={scheduler.dailyDisplayCount}
                onChange={(e) => setScheduler({ ...scheduler, dailyDisplayCount: Number(e.target.value) })}
                onBlur={() => saveScheduler({ dailyDisplayCount: scheduler.dailyDisplayCount })}
              />
              <p className="text-[11px] text-slate-600 mt-1">
                How many show on the public page at once - a different rotating subset each day.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Last ran: {scheduler.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString() : "never"}
          </p>
        </div>
      )}

      <form onSubmit={handleManualAdd} className="card p-6 space-y-3 mb-8">
        <h2 className="font-medium">Add astrologer manually</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
          <input className="input" type="number" min={0} placeholder="Years of experience" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} required />
        </div>
        <textarea className="input" placeholder="Bio" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required />
        <button className="btn-primary" disabled={busy}>Add astrologer</button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(50);
          }}
        />
        <p className="text-xs text-slate-500">{astrologers.length} total</p>
      </div>

      <div className="space-y-3">
        {astrologers
          .filter((a) => {
            const q = search.toLowerCase();
            return !q || a.name.toLowerCase().includes(q) || a.specialty.toLowerCase().includes(q);
          })
          .slice(0, visibleCount)
          .map((a) => (
            <div key={a.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.photoUrl} alt={a.name} className="w-10 h-10 rounded-full object-cover bg-white/10" />
                <div>
                  <p className="font-medium">
                    {a.name} <span className="text-xs text-slate-500">· {a.source === "BOT" ? "bot-created" : "manual"}</span>
                  </p>
                  <p className="text-xs text-slate-400">{a.specialty} · {a.experienceYears} yrs · ★ {a.rating.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={"text-xs px-2 py-1 rounded-full " + (a.active ? "bg-green-500/20 text-green-400" : "bg-white/10 text-slate-500")}>
                  {a.active ? "Active" : "Retired"}
                </span>
                {a.active && (
                  <button className="text-xs text-red-400 hover:underline" onClick={() => handleRetire(a.id)} disabled={busy}>
                    Retire
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {visibleCount < astrologers.length && (
        <button className="btn-secondary w-full mt-4" onClick={() => setVisibleCount((v) => v + 50)}>
          Show more
        </button>
      )}
    </AdminGuard>
  );
}
