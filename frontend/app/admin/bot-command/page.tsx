"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface Broadcast {
  id: string;
  formalizedText: string;
  mode: "MANUAL" | "AUTONOMOUS";
  createdAt: string;
}

export default function BotCommandCenterPage() {
  const [mode, setMode] = useState<"MANUAL" | "AUTONOMOUS">("AUTONOMOUS");
  const [rawInput, setRawInput] = useState("");
  const [formalized, setFormalized] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [busy, setBusy] = useState(false);
  const token = getAdminToken();

  async function refresh() {
    const [settings, list] = await Promise.all([
      apiGet("/bot/settings", token),
      apiGet("/bot/broadcasts"),
    ]);
    setMode(settings.settings.mode);
    setBroadcasts(list.broadcasts);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleMode(next: "MANUAL" | "AUTONOMOUS") {
    setBusy(true);
    try {
      await apiPost("/bot/admin/mode", { mode: next }, token);
      setMode(next);
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview() {
    if (!rawInput.trim()) return;
    setBusy(true);
    setFormalized(null);
    try {
      const data = await apiPost("/bot/admin/command/preview", { message: rawInput }, token);
      setFormalized(data.formalizedText);
      setAiConfigured(data.aiConfigured);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!formalized) return;
    setBusy(true);
    try {
      await apiPost("/bot/admin/command/publish", { rawInput, formalizedText: formalized }, token);
      setRawInput("");
      setFormalized(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAutonomousGenerate() {
    setBusy(true);
    try {
      await apiPost("/bot/admin/autonomous/generate", undefined, token);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Bot command center</h1>
      <p className="text-slate-500 text-sm mb-6">
        Say what you want AstroBot to tell users in plain language - it will rewrite it formally
        before anything is published. When you&apos;re not actively commanding it, switch it to
        independent mode and it will generate its own predictions and insights.
      </p>

      <div className="card p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="font-medium">Bot mode</p>
          <p className="text-xs text-slate-500">
            {mode === "MANUAL" ? "Waiting on your direction" : "Operating independently"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={mode === "MANUAL" ? "btn-primary" : "btn-secondary"}
            onClick={() => toggleMode("MANUAL")}
            disabled={busy}
          >
            Manual
          </button>
          <button
            className={mode === "AUTONOMOUS" ? "btn-primary" : "btn-secondary"}
            onClick={() => toggleMode("AUTONOMOUS")}
            disabled={busy}
          >
            Autonomous
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-3 mb-8">
        <h2 className="font-medium">Command AstroBot</h2>
        <textarea
          className="input"
          rows={3}
          placeholder="e.g. tell everyone we're adding 3 new astrologers this week and wallet top ups are back to normal speed"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
        />
        <button className="btn-secondary" onClick={handlePreview} disabled={busy || !rawInput.trim()}>
          Preview formal version
        </button>

        {formalized && (
          <div className="bg-orange-50 rounded-xl p-4 mt-2 space-y-3">
            {!aiConfigured && (
              <p className="text-amber-600 text-xs">AI not configured - showing your raw message as a fallback.</p>
            )}
            <p className="text-slate-700">{formalized}</p>
            <button className="btn-primary" onClick={handlePublish} disabled={busy}>
              Publish to users
            </button>
          </div>
        )}
      </div>

      <div className="card p-6 mb-8">
        <h2 className="font-medium mb-1">Independent mode</h2>
        <p className="text-xs text-slate-500 mb-3">
          Have AstroBot generate and publish its own community message right now.
        </p>
        <button className="btn-secondary" onClick={handleAutonomousGenerate} disabled={busy}>
          Generate independent message
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-medium mb-4">Broadcast history</h2>
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="border-b border-orange-100 pb-3">
              <p className="text-sm text-slate-700">{b.formalizedText}</p>
              <p className="text-xs text-slate-500 mt-1">
                {b.mode} · {new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
