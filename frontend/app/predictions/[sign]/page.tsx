"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiPost, ZODIAC_SIGNS } from "@/lib/api";
import { getUserToken } from "@/lib/session";
import { findZodiac } from "@/lib/zodiac";

type Period = "daily" | "weekly" | "monthly";
type ReadingType = "general" | "love" | "career" | "finance" | "compatibility";

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const TYPE_TABS: { value: ReadingType; label: string }[] = [
  { value: "general", label: "Overview" },
  { value: "love", label: "Love" },
  { value: "career", label: "Career" },
  { value: "finance", label: "Finance" },
  { value: "compatibility", label: "Compatibility" },
];

export default function PredictionDetailPage() {
  const params = useParams<{ sign: string }>();
  const signParam = Array.isArray(params.sign) ? params.sign[0] : params.sign;
  const zodiac = findZodiac(signParam ?? "");

  const [period, setPeriod] = useState<Period>("daily");
  const [type, setType] = useState<ReadingType>("general");
  const [compatWith, setCompatWith] = useState(ZODIAC_SIGNS.find((z) => z !== zodiac?.name) ?? "Taurus");

  const [cache, setCache] = useState<Record<string, { text: string; aiConfigured: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cacheKey = useMemo(
    () => `${type}-${period}-${type === "compatibility" ? compatWith : ""}`,
    [type, period, compatWith]
  );

  useEffect(() => {
    if (!zodiac) return;
    if (cache[cacheKey]) return;

    const category = type === "career" || type === "finance" ? "CAREER" : type === "love" ? "LOVE" : "GENERAL";
    const question =
      type === "finance"
        ? "Focus specifically on money, finances, and material stability."
        : type === "compatibility"
        ? `Focus specifically on compatibility, chemistry, and relationship dynamics between ${zodiac.name} and ${compatWith}.`
        : undefined;

    setLoading(true);
    setError("");
    apiPost(
      "/predictions",
      { category, zodiacSign: zodiac.name, period, question },
      getUserToken()
    )
      .then((data) => {
        setCache((prev) => ({
          ...prev,
          [cacheKey]: { text: data.prediction.resultText, aiConfigured: data.aiConfigured },
        }));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, zodiac]);

  if (!zodiac) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <p className="text-ash-light">We couldn&apos;t find that zodiac sign.</p>
        <Link href="/predictions" className="text-brand-dark font-medium hover:underline">← Back to predictions</Link>
      </div>
    );
  }

  const current = cache[cacheKey];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <p className="text-5xl">{zodiac.symbol}</p>
        <h1 className="text-3xl font-bold text-white mt-2">{zodiac.name}</h1>
        <p className="text-ash-light text-sm">{zodiac.dateRange} · {zodiac.element}</p>
        <Link href="/predictions" className="inline-block mt-3 text-xs text-brand-dark hover:underline">
          ← All signs
        </Link>
      </div>

      <div className="card p-1.5 flex flex-wrap gap-1 justify-center">
        {PERIOD_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setPeriod(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === t.value ? "bg-brand text-white" : "text-slate-600 hover:bg-orange-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              type === t.value
                ? "bg-brand-dark text-white border-brand-dark"
                : "text-slate-600 border-orange-200 hover:bg-orange-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === "compatibility" && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-slate-500">Compare with</span>
          <select className="input !w-auto" value={compatWith} onChange={(e) => setCompatWith(e.target.value)}>
            {ZODIAC_SIGNS.filter((z) => z !== zodiac.name).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      )}

      <div className="card p-6 min-h-[180px]">
        {loading && !current && <p className="text-slate-400 text-sm">Reading the stars...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {current && (
          <>
            {!current.aiConfigured && (
              <p className="text-amber-600 text-xs mb-3">
                Note: this is a placeholder response - the admin hasn&apos;t connected the AI engine yet.
              </p>
            )}
            <p className="whitespace-pre-line text-slate-700">{current.text}</p>
          </>
        )}
      </div>
    </div>
  );
}
