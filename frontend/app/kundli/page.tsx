"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

interface Result {
  resultText: string;
  aiConfigured: boolean;
}

export default function KundliPage() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost("/kundli", {
        name,
        dob,
        timeOfBirth: timeOfBirth || undefined,
        placeOfBirth: placeOfBirth || undefined,
      });
      setResult({ resultText: data.reading.resultText, aiConfigured: data.aiConfigured });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Kundli - Birth Chart Reading</h1>
        <p className="text-slate-500 mt-1">
          Enter your birth details for a personalized Vedic birth chart reading.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Looking to check compatibility with someone instead? <Link href="/kundli/match" className="text-brand-dark font-medium hover:underline">Try Kundli matching →</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Date of birth</label>
            <input
              className="input"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Time of birth (optional)</label>
            <input className="input" type="time" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Place of birth (optional)</label>
          <input className="input" placeholder="e.g. Jaipur, India" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Reading your chart..." : "Generate my Kundli"}
        </button>
      </form>

      {result && (
        <div className="card-royal p-6">
          {!result.aiConfigured && (
            <p className="text-amber-600 text-xs mb-3">
              Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
            </p>
          )}
          <p className="whitespace-pre-line text-slate-700">{result.resultText}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Kundli reading is offered for entertainment and self-reflection, not guaranteed fact.
      </p>
    </div>
  );
}
