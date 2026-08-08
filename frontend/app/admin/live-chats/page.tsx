"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface ActiveConversation {
  id: string;
  messageCount: number;
  updatedAt: string;
  astrologer: { id: string; name: string; photoUrl: string };
  user: { id: string; name: string; email: string };
}

interface Message {
  id: string;
  sender: "USER" | "ASTROLOGER";
  content: string;
  createdAt: string;
}

export default function LiveChatsPage() {
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [directive, setDirective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = getAdminToken();

  async function refreshList() {
    const data = await apiGet("/conversations/admin/active", token);
    setConversations(data.conversations);
  }

  async function openConversation(id: string) {
    setSelectedId(id);
    setError("");
    const data = await apiGet(`/conversations/admin/${id}`, token);
    setMessages(data.messages);
  }

  useEffect(() => {
    refreshList();
    const interval = setInterval(refreshList, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !directive.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiPost(`/conversations/admin/${selectedId}/inject`, { directive }, token);
      setMessages((prev) => [...prev, data.message]);
      setDirective("");
      if (!data.configured) {
        setError("AI isn't configured right now - that message is a placeholder, not a real formalized reply.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Live chats</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">
        Watch consultations as they happen. Pick one and jot a casual note - AstroBot formalizes it
        into the astrologer&apos;s next message, in character, exactly as the user will see it. Never
        billed to the user&apos;s wallet.
      </p>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-2">
          {conversations.length === 0 && <p className="text-slate-500 text-sm">No active consultations right now.</p>}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={
                "w-full text-left card p-3 flex items-center gap-3 transition-all " +
                (selectedId === c.id ? "border-maroon/40 ring-1 ring-maroon/30" : "")
              }
            >
              <Image
                src={c.astrologer.photoUrl}
                alt={c.astrologer.name}
                width={36}
                height={36}
                className="rounded-full w-9 h-9 object-cover bg-orange-50"
                unoptimized
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.user.name} ↔ {c.astrologer.name}</p>
                <p className="text-xs text-slate-500 truncate">{c.messageCount} messages · {new Date(c.updatedAt).toLocaleTimeString()}</p>
              </div>
            </button>
          ))}
        </div>

        <div>
          {!selected && (
            <div className="card p-8 text-center text-slate-400 text-sm">
              Select a conversation on the left to view and direct it.
            </div>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="card p-4 max-h-[420px] overflow-y-auto space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={"flex " + (m.sender === "USER" ? "justify-end" : "justify-start")}>
                    <div
                      className={
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                        (m.sender === "USER" ? "bg-brand text-white" : "bg-orange-50 text-slate-700")
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleInject} className="card p-4 space-y-3">
                <label className="text-xs text-slate-500 block">
                  Directive - plain English, casual is fine. AstroBot writes it as {selected.astrologer.name}.
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. reassure them about the job interview, mention Jupiter's transit favors this week"
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  required
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button className="btn-primary" disabled={busy}>
                  {busy ? "Sending as astrologer..." : "Send as astrologer"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
