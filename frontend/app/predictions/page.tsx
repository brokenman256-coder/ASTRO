"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, ZODIAC_SIGNS } from "@/lib/api";
import { getUserToken } from "@/lib/session";
import { ZODIAC_DATA } from "@/lib/zodiac";

interface PastPrediction {
  id: string;
  category: string;
  zodiacSign: string;
  resultText: string;
  createdAt: string;
}

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
  const [pastPredictions, setPastPredictions] = useState<PastPrediction[]>([]);

  useEffect(() => {
    const token = getUserToken();
    if (!token) return;
    apiGet("/predictions/mine", token)
      .then((d) => setPastPredictions(d.predictions))
      .catch(() => {});
  }, []);

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
      if (getUserToken()) setPastPredictions((prev) => [data.prediction, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-white">Predictions</h1>
        <p className="text-ash-light mt-1">Pick your sign for a full reading, or ask your own question below.</p>
      </div>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {ZODIAC_DATA.map((z) => (
            <Link
              key={z.name}
              href={`/predictions/${z.name.toLowerCase()}`}
              className="card p-5 text-center hover:shadow-md hover:border-brand/40 transition-all"
            >
              <p className="text-4xl">{z.symbol}</p>
              <p className="font-semibold text-slate-800 mt-2">{z.name}</p>
              <p className="text-xs text-slate-400">{z.dateRange}</p>
              <span className="inline-block mt-3 text-xs text-brand-dark font-medium">Read More →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Ask Your Own Question</h2>
          <p className="text-slate-500 text-sm mt-1">Get a custom AI reading tailored to what's on your mind.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Zodiac sign</label>
              <select className="input" value={zodiacSign} onChange={(e) => setZodiacSign(e.target.value)}>
                {ZODIAC_SIGNS.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Anything specific on your mind? (optional)</label>
            <textarea className="input" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Reading the stars..." : "Get my prediction"}
          </button>
        </form>

        {result && (
          <div className="card p-6">
            {!aiConfigured && (
              <p className="text-amber-600 text-xs mb-3">
                Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
              </p>
            )}
            <p className="whitespace-pre-line text-slate-700">{result}</p>
          </div>
        )}

        {pastPredictions.length > 0 && (
          <div className="card p-6">
            <h2 className="font-medium mb-4">Your past readings</h2>
            <div className="space-y-4">
              {pastPredictions.map((p) => (
                <div key={p.id} className="border-b border-orange-100 pb-4 last:border-none last:pb-0">
                  <p className="text-xs text-slate-500 mb-1">
                    {p.category} · {p.zodiacSign} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{p.resultText}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
