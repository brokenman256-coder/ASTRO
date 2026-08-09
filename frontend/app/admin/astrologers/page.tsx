"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
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
  personality: string;
  tone: string;
  languages: string[];
  greeting: string;
  astrologyStyle: string;
  systemInstructions: string;
  priceRupeesPerMinute: number;
}

interface PersonaFormState {
  name: string;
  specialty: string;
  astrologyStyle: string;
  experienceYears: string;
  bio: string;
  personality: string;
  tone: string;
  languages: string;
  greeting: string;
  systemInstructions: string;
  priceRupeesPerMinute: string;
}

const EMPTY_PERSONA: PersonaFormState = {
  name: "",
  specialty: "",
  astrologyStyle: "",
  experienceYears: "5",
  bio: "",
  personality: "",
  tone: "",
  languages: "English",
  greeting: "",
  systemInstructions: "",
  priceRupeesPerMinute: "15",
};

interface SchedulerSettings {
  enabled: boolean;
  intervalMinutes: number;
  maxActiveAstrologers: number;
  dailyDisplayCount: number;
  lastRunAt: string | null;
  refreshEnabled: boolean;
  refreshIntervalMinutes: number;
  refreshBatchSize: number;
  lastRefreshAt: string | null;
}

export default function AdminAstrologersPage() {
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<PersonaFormState>(EMPTY_PERSONA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PersonaFormState>(EMPTY_PERSONA);
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
    if (!confirm(`Create ${count} Aghori profiles now? This uses placeholder avatars (no AI image cost) and can't be undone in bulk - you'd have to retire them one by one.`)) {
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

function toPayload(f: PersonaFormState) {
    return {
      name: f.name,
      specialty: f.specialty,
      astrologyStyle: f.astrologyStyle || f.specialty,
      experienceYears: parseInt(f.experienceYears, 10) || 0,
      bio: f.bio,
      personality: f.personality || undefined,
      tone: f.tone || undefined,
      languages: f.languages.split(",").map((l) => l.trim()).filter(Boolean),
      greeting: f.greeting || undefined,
      systemInstructions: f.systemInstructions || undefined,
      priceRupeesPerMinute: parseInt(f.priceRupeesPerMinute, 10) || 15,
    };
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/astrologers/admin", toPayload(form), token);
      setForm(EMPTY_PERSONA);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a: Astrologer) {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      specialty: a.specialty,
      astrologyStyle: a.astrologyStyle,
      experienceYears: String(a.experienceYears),
      bio: a.bio,
      personality: a.personality,
      tone: a.tone,
      languages: a.languages.join(", "),
      greeting: a.greeting,
      systemInstructions: a.systemInstructions,
      priceRupeesPerMinute: String(a.priceRupeesPerMinute),
    });
  }

  async function handleEditSave(id: string) {
    setBusy(true);
    try {
      await apiPatch(`/astrologers/admin/${id}`, toPayload(editForm), token);
      setEditingId(null);
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
      <h1 className="text-2xl font-semibold mb-2">Aghori roster</h1>
      <p className="text-slate-500 text-sm mb-6">
        Use the bot to automatically add fresh Aghori profiles or retire stale/low-rated ones -
        just like a live consultation marketplace rotates its roster.
      </p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary" onClick={runBotAdd} disabled={busy}>
          🤖 Bot: Add new Aghori
        </button>
        <button className="btn-secondary" onClick={runBotPrune} disabled={busy}>
          🤖 Bot: Retire lowest-rated
        </button>
      </div>
      {message && <p className="text-sm text-brand mb-6">{message}</p>}

      <div className="card p-6 mb-8 space-y-3">
        <h2 className="font-medium">Bulk-generate Aghoris</h2>
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
                When on, the bot adds a new Aghori every {scheduler.intervalMinutes} minute
                {scheduler.intervalMinutes === 1 ? "" : "s"} on its own, generating an AI headshot
                if <code className="text-slate-500">OPENAI_API_KEY</code> is configured. It retires
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
              <label className="text-xs text-slate-500 block mb-1">Interval (minutes)</label>
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
              <label className="text-xs text-slate-500 block mb-1">Max active roster size</label>
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
              <label className="text-xs text-slate-500 block mb-1">Featured per day</label>
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

          <div className="border-t border-orange-100 pt-4 flex items-center justify-between">
            <div>
              <h2 className="font-medium">Info-refresh bot</h2>
              <p className="text-xs text-slate-500 mt-1">
                Every {scheduler.refreshIntervalMinutes} minutes, randomizes name/specialty/experience/rating/bio/photo
                for {scheduler.refreshBatchSize} random bot-generated Aghoris (never the hand-curated named
                personas, and never anyone with a consultation in progress).
              </p>
            </div>
            <button
              className={scheduler.refreshEnabled ? "btn-primary" : "btn-secondary"}
              onClick={() => saveScheduler({ refreshEnabled: !scheduler.refreshEnabled })}
              disabled={schedulerSaving}
            >
              {scheduler.refreshEnabled ? "On" : "Off"}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Refresh interval (minutes)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={1440}
                value={scheduler.refreshIntervalMinutes}
                onChange={(e) => setScheduler({ ...scheduler, refreshIntervalMinutes: Number(e.target.value) })}
                onBlur={() => saveScheduler({ refreshIntervalMinutes: scheduler.refreshIntervalMinutes })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Aghoris refreshed per run</label>
              <input
                className="input"
                type="number"
                min={1}
                max={200}
                value={scheduler.refreshBatchSize}
                onChange={(e) => setScheduler({ ...scheduler, refreshBatchSize: Number(e.target.value) })}
                onBlur={() => saveScheduler({ refreshBatchSize: scheduler.refreshBatchSize })}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Last refreshed: {scheduler.lastRefreshAt ? new Date(scheduler.lastRefreshAt).toLocaleString() : "never"}
          </p>
        </div>
      )}

      <form onSubmit={handleManualAdd} className="card p-6 space-y-3 mb-8">
        <h2 className="font-medium">Add a new AI Aghori</h2>
        <p className="text-xs text-slate-500">
          Create a fully independent AI persona - no code changes needed. The system instructions
          define how this Aghori talks and what it focuses on.
        </p>
        <PersonaFields value={form} onChange={setForm} />
        <button className="btn-primary" disabled={busy}>Create Aghori</button>
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
            <div key={a.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.photoUrl} alt={a.name} className="w-10 h-10 rounded-full object-cover bg-orange-50" />
                  <div>
                    <p className="font-medium">
                      {a.name} <span className="text-xs text-slate-500">· {a.source === "BOT" ? "bot-created" : "manual"}</span>
                    </p>
                    <p className="text-xs text-slate-500">{a.specialty} · {a.experienceYears} yrs · ★ {a.rating.toFixed(1)} · ₹{a.priceRupeesPerMinute}/min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={"text-xs px-2 py-1 rounded-full " + (a.active ? "bg-green-500/20 text-green-600" : "bg-orange-50 text-slate-500")}>
                    {a.active ? "Active" : "Retired"}
                  </span>
                  <button
                    className="text-xs text-brand-dark hover:underline"
                    onClick={() => (editingId === a.id ? setEditingId(null) : startEdit(a))}
                  >
                    {editingId === a.id ? "Close" : "Edit"}
                  </button>
                  {a.active && (
                    <button className="text-xs text-red-600 hover:underline" onClick={() => handleRetire(a.id)} disabled={busy}>
                      Retire
                    </button>
                  )}
                </div>
              </div>

              {editingId === a.id && (
                <div className="mt-4 pt-4 border-t border-orange-100 space-y-3">
                  <PersonaFields value={editForm} onChange={setEditForm} />
                  <button className="btn-primary !py-1.5" onClick={() => handleEditSave(a.id)} disabled={busy}>
                    Save changes
                  </button>
                </div>
              )}
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

function PersonaFields({
  value,
  onChange,
}: {
  value: PersonaFormState;
  onChange: (v: PersonaFormState) => void;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} required />
        <input className="input" placeholder="Specialty (e.g. Love & Relationships)" value={value.specialty} onChange={(e) => onChange({ ...value, specialty: e.target.value })} required />
        <input className="input" placeholder="Astrology style (e.g. Vedic Astrology)" value={value.astrologyStyle} onChange={(e) => onChange({ ...value, astrologyStyle: e.target.value })} />
        <input className="input" type="number" min={0} placeholder="Years of experience" value={value.experienceYears} onChange={(e) => onChange({ ...value, experienceYears: e.target.value })} required />
        <input className="input" placeholder="Languages, comma-separated" value={value.languages} onChange={(e) => onChange({ ...value, languages: e.target.value })} />
        <input className="input" type="number" min={1} placeholder="Price (₹/min)" value={value.priceRupeesPerMinute} onChange={(e) => onChange({ ...value, priceRupeesPerMinute: e.target.value })} />
      </div>
      <textarea className="input" placeholder="Bio (shown on the marketplace)" rows={2} value={value.bio} onChange={(e) => onChange({ ...value, bio: e.target.value })} required />
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Personality (e.g. Warm, empathetic)" value={value.personality} onChange={(e) => onChange({ ...value, personality: e.target.value })} />
        <input className="input" placeholder="Tone (e.g. Friendly and reassuring)" value={value.tone} onChange={(e) => onChange({ ...value, tone: e.target.value })} />
      </div>
      <textarea className="input" placeholder="Opening greeting shown when a chat starts" rows={2} value={value.greeting} onChange={(e) => onChange({ ...value, greeting: e.target.value })} />
      <textarea
        className="input"
        placeholder="AI system instructions - how this Aghori should talk and what to focus on"
        rows={4}
        value={value.systemInstructions}
        onChange={(e) => onChange({ ...value, systemInstructions: e.target.value })}
      />
    </>
  );
}
