"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

interface Result {
  score: number;
  resultText: string;
  aiConfigured: boolean;
}

export default function KundliMatchPage() {
  const [person1Name, setPerson1Name] = useState("");
  const [person1Dob, setPerson1Dob] = useState("");
  const [person2Name, setPerson2Name] = useState("");
  const [person2Dob, setPerson2Dob] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost("/kundli/match", { person1Name, person1Dob, person2Name, person2Dob });
      setResult({ score: data.match.score, resultText: data.match.resultText, aiConfigured: data.aiConfigured });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Kundli Matching</h1>
        <p className="text-slate-500 mt-1">
          Check compatibility between two people using traditional Guna Milan matching.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-maroon">Person 1</p>
            <input className="input" placeholder="Name" value={person1Name} onChange={(e) => setPerson1Name(e.target.value)} required />
            <input
              className="input"
              type="date"
              value={person1Dob}
              onChange={(e) => setPerson1Dob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-maroon">Person 2</p>
            <input className="input" placeholder="Name" value={person2Name} onChange={(e) => setPerson2Name(e.target.value)} required />
            <input
              className="input"
              type="date"
              value={person2Dob}
              onChange={(e) => setPerson2Dob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Matching your charts..." : "Check compatibility"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="card-royal p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400">Guna Milan Score</p>
            <p className="font-display text-5xl font-bold text-gold-foil mt-2">{result.score}<span className="text-2xl text-slate-400">/36</span></p>
          </div>
          <div className="card p-6">
            {!result.aiConfigured && (
              <p className="text-amber-600 text-xs mb-3">
                Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
              </p>
            )}
            <p className="whitespace-pre-line text-slate-700">{result.resultText}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Kundli matching is offered for entertainment and self-reflection, not guaranteed fact.
      </p>
    </div>
  );
}
