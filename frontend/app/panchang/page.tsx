"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface PanchangData {
  date: string;
  panchang: string;
  luckScore: number;
  aiConfigured: boolean;
}

function luckLabel(score: number): string {
  if (score >= 80) return "Excellent day";
  if (score >= 60) return "Favorable day";
  if (score >= 40) return "Balanced day";
  if (score >= 20) return "Proceed with care";
  return "Take it slow today";
}

export default function PanchangPage() {
  const [data, setData] = useState<PanchangData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/panchang")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Today&apos;s Panchang</h1>
        <p className="text-slate-500 mt-1">The daily Vedic almanac, and your personal luck score for today.</p>
      </div>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      {data && (
        <>
          <div className="card-royal p-8 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400">Your Luck Score</p>
            <p className="font-display text-6xl font-bold text-gold-foil mt-2">{data.luckScore}</p>
            <p className="text-sm text-maroon font-semibold mt-2">{luckLabel(data.luckScore)}</p>
            <div className="w-full h-2 bg-orange-100 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${data.luckScore}%`,
                  backgroundImage: "linear-gradient(90deg, #7a1230, #f5b942)",
                }}
              />
            </div>
          </div>

          <div className="card p-6">
            {!data.aiConfigured && (
              <p className="text-amber-600 text-xs mb-3">
                Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
              </p>
            )}
            <p className="text-xs text-slate-400 mb-3">{data.date}</p>
            <p className="whitespace-pre-line text-slate-700">{data.panchang}</p>
          </div>
        </>
      )}

      {!data && !error && <p className="text-slate-400 text-center">Loading...</p>}
    </div>
  );
}
