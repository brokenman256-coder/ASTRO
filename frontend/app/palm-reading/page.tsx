"use client";

import { useState } from "react";
import { apiUpload } from "@/lib/api";
import { getUserToken } from "@/lib/session";

const LINES = [
  { name: "Life Line", desc: "Vitality, wellbeing, and major life shifts." },
  { name: "Head Line", desc: "Thinking style, focus, and decision-making." },
  { name: "Heart Line", desc: "Emotional life, love, and relationships." },
  { name: "Fate Line", desc: "Career direction and outside influences." },
];

export default function PalmReadingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError("");
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await apiUpload("/palm-reading", formData, getUserToken());
      setResult(data.reading.resultText);
      setAiConfigured(data.aiConfigured);
    } catch {
      setError("We couldn't read your photo. Try a clearer, well-lit shot of your open palm.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-white">Palm Reading</h1>
        <p className="text-ash-light mt-1">
          Upload a clear, well-lit photo of your open palm for a detailed AI-guided reading.
        </p>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LINES.map((l) => (
          <div key={l.name} className="card p-4 text-center">
            <p className="text-sm font-semibold text-slate-800">{l.name}</p>
            <p className="text-xs text-slate-500 mt-1">{l.desc}</p>
          </div>
        ))}
      </section>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-2">
            Photo of your open palm, palm facing the camera, in good light
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
          />
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Palm preview" className="max-h-64 rounded-xl mx-auto" />
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading || !file}>
          {loading ? "Reading your palm..." : "Get my reading"}
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

      <p className="text-xs text-slate-400 text-center">
        Palm reading is offered for entertainment and self-reflection, not medical, legal, or
        financial advice.
      </p>
    </div>
  );
}
