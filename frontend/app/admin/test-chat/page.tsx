"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface AstrologerOption {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function AdminTestChatPage() {
  const [astrologers, setAstrologers] = useState<AstrologerOption[]>([]);
  const [astrologerId, setAstrologerId] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = getAdminToken();

  useEffect(() => {
    apiGet("/astrologers/admin/all", token).then((d) => {
      const active = d.astrologers.filter((a: { active: boolean }) => a.active).slice(0, 200);
      setAstrologers(active);
      if (active.length > 0) setAstrologerId(active[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchAstrologer(id: string) {
    setAstrologerId(id);
    setTurns([]);
    setError("");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!astrologerId || !input.trim()) return;
    const content = input;
    setInput("");
    setBusy(true);
    setError("");
    const nextTurns: Turn[] = [...turns, { role: "user", content }];
    setTurns(nextTurns);
    try {
      const data = await apiPost(`/astrologers/admin/${astrologerId}/test-chat`, { history: turns, content }, token);
      setTurns([...nextTurns, { role: "assistant", content: data.text }]);
      if (!data.configured) {
        setError("AI isn't configured right now - that reply is a placeholder.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const current = astrologers.find((a) => a.id === astrologerId);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Test chat</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">
        Talk to any astrologer directly to verify their persona and responses - full freedom to bring
        up any topic. Nothing here is billed, capped, or ever visible to real users; it&apos;s not
        saved as a consultation.
      </p>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Astrologer</label>
          <select className="input mb-4" value={astrologerId} onChange={(e) => switchAstrologer(e.target.value)}>
            {astrologers.length === 0 && <option value="">No astrologers</option>}
            {astrologers.map((a) => (
              <option key={a.id} value={a.id}>{a.name} - {a.specialty}</option>
            ))}
          </select>
          {current && (
            <div className="card p-4 flex items-center gap-3">
              <Image
                src={current.photoUrl}
                alt={current.name}
                width={44}
                height={44}
                className="rounded-full w-11 h-11 object-cover bg-orange-50"
                unoptimized
              />
              <div>
                <p className="text-sm font-medium">{current.name}</p>
                <p className="text-xs text-slate-500">{current.specialty}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4 min-h-[320px] max-h-[420px] overflow-y-auto space-y-3">
            {turns.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No messages yet - say hello.</p>}
            {turns.map((t, i) => (
              <div key={i} className={"flex " + (t.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line " +
                    (t.role === "user" ? "bg-brand text-white" : "bg-orange-50 text-slate-700")
                  }
                >
                  {t.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Type anything - no topic restrictions in test mode"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!astrologerId}
            />
            <button className="btn-primary" disabled={busy || !astrologerId}>
              {busy ? "..." : "Send"}
            </button>
          </form>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
