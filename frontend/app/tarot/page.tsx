"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

interface TarotResult {
  cards: string[];
  reading: string;
  aiConfigured: boolean;
}

const SPREADS = [
  { count: 1 as const, label: "1 card", desc: "A quick, focused insight" },
  { count: 3 as const, label: "3 cards", desc: "Past, present, future" },
  { count: 5 as const, label: "5 cards", desc: "A deeper, fuller picture" },
];

const SUIT_ICON: Record<string, string> = {
  Cups: "🍷",
  Wands: "🔥",
  Swords: "⚔️",
  Pentacles: "🪙",
};

function cardIcon(name: string): string {
  for (const [suit, icon] of Object.entries(SUIT_ICON)) {
    if (name.includes(suit)) return icon;
  }
  return "✨"; // Major Arcana
}

function TarotCard({ name, revealed, delayMs }: { name: string; revealed: boolean; delayMs: number }) {
  return (
    <div
      className="relative w-full aspect-[2/3] [perspective:1000px] animate-fade-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Card back */}
        <div
          className="absolute inset-0 rounded-xl [backface-visibility:hidden] flex items-center justify-center border border-gold/40"
          style={{ backgroundImage: "linear-gradient(160deg, #1e2340, #2a1030 55%, #1e2340)" }}
        >
          <span className="text-gold-foil text-3xl font-display">✦</span>
        </div>
        {/* Card face */}
        <div
          className="absolute inset-0 rounded-xl [backface-visibility:hidden] flex flex-col items-center justify-center gap-2 border border-gold/50 p-2 text-center"
          style={{ transform: "rotateY(180deg)", backgroundImage: "linear-gradient(160deg, #fdf8ef, #f5ead0)" }}
        >
          <span className="text-3xl">{cardIcon(name)}</span>
          <p className="font-display text-sm font-bold text-maroon leading-tight">{name}</p>
        </div>
      </div>
    </div>
  );
}

export default function TarotPage() {
  const [cardCount, setCardCount] = useState<1 | 3 | 5>(3);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<TarotResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDraw(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    setRevealed(false);
    try {
      const data = await apiPost("/tarot", { question: question || undefined, cardCount });
      setResult({ cards: data.cards, reading: data.reading.resultText, aiConfigured: data.aiConfigured });
      setTimeout(() => setRevealed(true), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-white">Tarot Reading</h1>
        <p className="text-ash-light mt-1">
          Ask a question, or leave it open, and draw your cards for an AI-guided reading.
        </p>
      </div>

      <form onSubmit={handleDraw} className="card p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Your question (optional)</label>
          <input
            className="input"
            placeholder="e.g. What should I focus on this month?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-2">Spread</label>
          <div className="grid grid-cols-3 gap-2">
            {SPREADS.map((s) => (
              <button
                key={s.count}
                type="button"
                onClick={() => setCardCount(s.count)}
                className={
                  "rounded-xl border p-3 text-center transition-all " +
                  (cardCount === s.count ? "border-maroon ring-1 ring-maroon bg-orange-50" : "border-orange-200")
                }
              >
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Shuffling the deck..." : "Draw my cards"}
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          <div className={"grid gap-4 " + (result.cards.length === 1 ? "grid-cols-1 max-w-[160px] mx-auto" : result.cards.length === 3 ? "grid-cols-3" : "grid-cols-5")}>
            {result.cards.map((c, i) => (
              <TarotCard key={i} name={c} revealed={revealed} delayMs={i * 150} />
            ))}
          </div>

          <div className="card p-6">
            {!result.aiConfigured && (
              <p className="text-amber-600 text-xs mb-3">
                Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
              </p>
            )}
            <p className="whitespace-pre-line text-slate-700">{result.reading}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Tarot reading is offered for entertainment and self-reflection, not guaranteed fact.
      </p>
    </div>
  );
}
