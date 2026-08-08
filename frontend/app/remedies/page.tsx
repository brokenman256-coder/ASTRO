"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface PastRemedy {
  id: string;
  concern: string;
  resultText: string;
  createdAt: string;
}

interface RemedyCategory {
  title: string;
  category: string;
  explanation: string;
  instructions: string;
  concern: string;
}

const CATEGORIES: RemedyCategory[] = [
  {
    title: "Career Breakthroughs",
    category: "Career",
    explanation: "For when your work feels stuck, blocked, or directionless.",
    instructions: "A daily practice to clear obstacles and sharpen ambition.",
    concern: "My career feels stuck and blocked - I need clarity and momentum on my next move.",
  },
  {
    title: "Relationship Harmony",
    category: "Relationships",
    explanation: "For discord, distance, or tension with someone close to you.",
    instructions: "A practice to soften conflict and rebuild connection.",
    concern: "There's conflict and discord in one of my close relationships.",
  },
  {
    title: "Inner Confidence",
    category: "Confidence",
    explanation: "For self-doubt, hesitation, or fear of being seen.",
    instructions: "A practice to build quiet, steady self-assurance.",
    concern: "I struggle with low confidence and self-doubt.",
  },
  {
    title: "Focus & Clarity",
    category: "Focus",
    explanation: "For a scattered mind and difficulty concentrating.",
    instructions: "A practice to sharpen attention and mental discipline.",
    concern: "I keep losing focus and getting distracted easily.",
  },
  {
    title: "Inner Peace",
    category: "Peace",
    explanation: "For anxiety, restlessness, or a mind that won't settle.",
    instructions: "A calming practice for emotional steadiness.",
    concern: "I've been feeling anxious and restless and can't seem to settle down.",
  },
  {
    title: "General Wellbeing",
    category: "General Wellbeing",
    explanation: "For overall balance when nothing feels specifically wrong, but nothing feels quite right either.",
    instructions: "A grounding practice for holistic balance.",
    concern: "I want a general practice for balance and wellbeing in my everyday life.",
  },
  {
    title: "Education & Learning",
    category: "Education",
    explanation: "For students facing exam stress or trouble absorbing new material.",
    instructions: "A practice to support memory, discipline, and calm focus while studying.",
    concern: "I'm struggling with exam stress and trouble retaining what I study.",
  },
  {
    title: "Success & Achievement",
    category: "Success",
    explanation: "For pursuing a big goal and needing extra determination.",
    instructions: "A practice traditionally associated with willpower and favorable outcomes.",
    concern: "I'm working toward an important goal and want extra strength and determination to see it through.",
  },
];

export default function RemediesPage() {
  const [concern, setConcern] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pastRemedies, setPastRemedies] = useState<PastRemedy[]>([]);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = getUserToken();
    if (!token) return;
    apiGet("/remedies/mine", token)
      .then((d) => setPastRemedies(d.remedies))
      .catch(() => {});
  }, []);

  async function requestRemedy(concernText: string, label: string) {
    if (!concernText.trim()) return;
    setError("");
    setLoading(true);
    setResult(null);
    setResultLabel(label);
    try {
      const data = await apiPost("/remedies", { concern: concernText }, getUserToken());
      setResult(data.remedy.resultText);
      setAiConfigured(data.aiConfigured);
      if (getUserToken()) setPastRemedies((prev) => [data.remedy, ...prev]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    requestRemedy(concern, "Your Remedy");
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Remedies</h1>
        <p className="text-slate-500 mt-1 max-w-xl mx-auto">
          Pick what&apos;s troubling you, and receive a specific mantra or practice drawn from the
          Bhagavad Gita, the Vedas, and other Hindu scriptures to help restore balance.
        </p>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((c) => (
          <div key={c.title} className="card p-5 flex flex-col">
            <span className="inline-block w-fit text-[10px] font-semibold uppercase tracking-wide text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
              {c.category}
            </span>
            <h3 className="font-semibold text-slate-800 mt-2">{c.title}</h3>
            <p className="text-xs text-slate-500 mt-1 flex-1">{c.explanation}</p>
            <p className="text-xs text-slate-400 mt-2 italic">{c.instructions}</p>
            <button
              onClick={() => requestRemedy(c.concern, c.title)}
              disabled={loading}
              className="btn-primary !py-1.5 text-xs mt-4"
            >
              Learn More
            </button>
          </div>
        ))}
      </section>

      <section ref={resultRef} className="max-w-2xl mx-auto space-y-6">
        {(loading || result) && (
          <div className="card p-6">
            {resultLabel && <h2 className="font-semibold text-slate-800 mb-3">{resultLabel}</h2>}
            {loading && <p className="text-slate-400 text-sm">Consulting the scriptures...</p>}
            {!loading && result && (
              <>
                {!aiConfigured && (
                  <p className="text-amber-600 text-xs mb-3">
                    Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
                  </p>
                )}
                <p className="whitespace-pre-line text-slate-700">{result}</p>
              </>
            )}
          </div>
        )}
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Describe It In Your Own Words</h2>
          <p className="text-slate-500 text-sm mt-1">Not seeing your situation above? Tell us directly.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">What&apos;s troubling you?</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. I keep losing focus at work"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Consulting the scriptures..." : "Get my remedy"}
          </button>
        </form>

        {pastRemedies.length > 0 && (
          <div className="card p-6">
            <h2 className="font-medium mb-4">Your past remedies</h2>
            <div className="space-y-4">
              {pastRemedies.map((r) => (
                <div key={r.id} className="border-b border-orange-100 pb-4 last:border-none last:pb-0">
                  <p className="text-xs text-slate-500 mb-1">
                    &quot;{r.concern}&quot; · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{r.resultText}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
