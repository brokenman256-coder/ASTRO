"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface PastRemedy {
  id: string;
  concern: string;
  resultText: string;
  createdAt: string;
}

const SUGGESTIONS = [
  "Lacking focus and getting distracted easily",
  "Feeling anxious or restless",
  "Career feels stuck or blocked",
  "Low confidence and self-doubt",
  "Conflict or discord in a relationship",
];

export default function RemediesPage() {
  const [concern, setConcern] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pastRemedies, setPastRemedies] = useState<PastRemedy[]>([]);

  useEffect(() => {
    const token = getUserToken();
    if (!token) return;
    apiGet("/remedies/mine", token)
      .then((d) => setPastRemedies(d.remedies))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!concern.trim()) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost("/remedies", { concern }, getUserToken());
      setResult(data.remedy.resultText);
      setAiConfigured(data.aiConfigured);
      if (getUserToken()) setPastRemedies((prev) => [data.remedy, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Remedies</h1>
        <p className="text-slate-400 mt-1">
          Tell AstroBot what you&apos;re struggling with, and it will suggest a specific mantra or
          practice from the Bhagavad Gita and other Hindu scriptures to help restore balance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">What&apos;s troubling you?</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. I keep losing focus at work"
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setConcern(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400"
            >
              {s}
            </button>
          ))}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Consulting the scriptures..." : "Get my remedy"}
        </button>
      </form>

      {result && (
        <div className="card p-6">
          {!aiConfigured && (
            <p className="text-amber-400 text-xs mb-3">
              Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
            </p>
          )}
          <p className="whitespace-pre-line text-slate-200">{result}</p>
        </div>
      )}

      {pastRemedies.length > 0 && (
        <div className="card p-6">
          <h2 className="font-medium mb-4">Your past remedies</h2>
          <div className="space-y-4">
            {pastRemedies.map((r) => (
              <div key={r.id} className="border-b border-white/5 pb-4 last:border-none last:pb-0">
                <p className="text-xs text-slate-500 mb-1">
                  &quot;{r.concern}&quot; · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-300 whitespace-pre-line">{r.resultText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
