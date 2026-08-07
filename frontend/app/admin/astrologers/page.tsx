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
  active: boolean;
  source: "MANUAL" | "BOT";
}

export default function AdminAstrologersPage() {
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", specialty: "", experienceYears: "5", bio: "" });

  const token = getAdminToken();

  async function refresh() {
    const data = await apiGet("/astrologers/admin/all", token);
    setAstrologers(data.astrologers);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="space-y-3">
        {astrologers.map((a) => (
          <div key={a.id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {a.name} <span className="text-xs text-slate-500">· {a.source === "BOT" ? "bot-created" : "manual"}</span>
              </p>
              <p className="text-xs text-slate-400">{a.specialty} · {a.experienceYears} yrs · ★ {a.rating.toFixed(1)}</p>
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
    </AdminGuard>
  );
}
