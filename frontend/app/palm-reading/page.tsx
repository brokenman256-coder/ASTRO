"use client";

import { useState } from "react";
import { apiUpload } from "@/lib/api";
import { getUserToken } from "@/lib/session";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Palm Reading</h1>
        <p className="text-slate-500 mt-1">
          Upload a clear, well-lit photo of your open palm for a detailed AI-guided reading.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
        />
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
    </div>
  );
}
