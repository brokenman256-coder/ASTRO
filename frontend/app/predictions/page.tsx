"use client";

import { useState } from "react";
import { apiPost, ZODIAC_SIGNS } from "@/lib/api";
import { getUserToken } from "@/lib/session";

const CATEGORIES = [
  { value: "DAILY", label: "Daily" },
  { value: "LOVE", label: "Love" },
  { value: "CAREER", label: "Career" },
  { value: "HEALTH", label: "Health" },
  { value: "GENERAL", label: "General" },
];

export default function PredictionsPage() {
  const [category, setCategory] = useState("DAILY");
  const [zodiacSign, setZodiacSign] = useState("Aries");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost(
        "/predictions",
        { category, zodiacSign, question: question || undefined },
        getUserToken()
      );
      setResult(data.prediction.resultText);
      setAiConfigured(data.aiConfigured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">AI Predictions</h1>
        <p className="text-slate-400 mt-1">Strong, specific readings tailored to your sign.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Zodiac sign</label>
            <select className="input" value={zodiacSign} onChange={(e) => setZodiacSign(e.target.value)}>
              {ZODIAC_SIGNS.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Anything specific on your mind? (optional)</label>
          <textarea className="input" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Reading the stars..." : "Get my prediction"}
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
    </div>
  );
}
