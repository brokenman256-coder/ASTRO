"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost, ZODIAC_SIGNS } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const CATEGORIES = [
  { value: "DAILY", label: "Daily" },
  { value: "LOVE", label: "Love" },
  { value: "CAREER", label: "Career" },
  { value: "HEALTH", label: "Health" },
  { value: "GENERAL", label: "General" },
];

export default function GuidedPredictionsPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [zodiacSign, setZodiacSign] = useState("Aries");
  const [keypoints, setKeypoints] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = getAdminToken();

  useEffect(() => {
    apiGet("/admin/users", token).then((d) => {
      setUsers(d.users);
      if (d.users.length > 0) setUserId(d.users[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !keypoints.trim()) return;
    setError("");
    setBusy(true);
    setResult(null);
    try {
      const data = await apiPost(
        "/predictions/admin/generate-for-user",
        { userId, category, zodiacSign, keypoints },
        token
      );
      setResult(data.prediction.resultText);
      setAiConfigured(data.aiConfigured);
      setKeypoints("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Guided predictions</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">
        Pick a user, jot down the keypoints in plain English - what you already know or want
        conveyed - and AstroBot writes it up as a full, formal astrology reading and saves it
        straight to that user&apos;s account. They&apos;ll see it exactly like any other AI
        prediction.
      </p>

      <form onSubmit={handleGenerate} className="card p-6 space-y-4 max-w-xl">
        <div>
          <label className="text-xs text-slate-400 block mb-1">User</label>
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
            {users.length === 0 && <option value="">No users yet</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>

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
          <label className="text-xs text-slate-400 block mb-1">Keypoints (plain English)</label>
          <textarea
            className="input"
            rows={4}
            placeholder="e.g. career is about to pick up next month, tell them to be cautious with a big purchase, and a relationship conversation goes well if they initiate it"
            value={keypoints}
            onChange={(e) => setKeypoints(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !userId}>
          {busy ? "Writing the reading..." : "Generate & save to user"}
        </button>
      </form>

      {result && (
        <div className="card p-6 max-w-xl mt-6">
          {!aiConfigured && (
            <p className="text-amber-400 text-xs mb-3">
              AI not configured - this is a placeholder, not a real formalized reading.
            </p>
          )}
          <p className="whitespace-pre-line text-slate-200">{result}</p>
        </div>
      )}
    </AdminGuard>
  );
}
