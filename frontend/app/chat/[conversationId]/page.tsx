"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
}

interface ConversationMessage {
  id: string;
  sender: "USER" | "ASTROLOGER";
  content: string;
  createdAt: string;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ConsultationChatPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState<"ACTIVE" | "ENDED">("ACTIVE");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedInput, setFailedInput] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [startingNew, setStartingNew] = useState(false);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = getUserToken();
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    Promise.all([
      apiGet(`/conversations/${params.conversationId}`, t),
      apiGet("/admin/ai-settings/session-limits"),
    ])
      .then(([d, limits]) => {
        setAstrologer(d.conversation.astrologer);
        setStatus(d.conversation.status);
        setMessages(d.messages);
        const startedAtMs = new Date(d.conversation.startedAt).getTime();
        setDeadline(startedAtMs + limits.maxSessionMinutes * 60 * 1000);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.conversationId, router]);

  useEffect(() => {
    if (!deadline || status !== "ACTIVE") return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setStatus("ENDED");
        setEndedReason("Your consultation session has ended.");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function submitMessage(text: string) {
    if (!token || sending || status === "ENDED") return;
    setSending(true);
    setSendError(null);
    setFailedInput(null);

    const optimisticUser: ConversationMessage = {
      id: `pending-${Date.now()}`,
      sender: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const data = await apiPost(`/conversations/${params.conversationId}/messages`, { content: text }, token);
      setAiConfigured(data.configured);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        data.userMessage,
        data.astrologerMessage,
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      const message = err instanceof Error ? err.message : "Sorry, the astrologer is temporarily unavailable. Please try again.";
      const lower = message.toLowerCase();
      if (lower.includes("session has ended") || lower.includes("wallet balance is too low")) {
        setStatus("ENDED");
        setEndedReason(message);
      } else {
        setSendError(message);
        setFailedInput(text);
      }
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput("");
    submitMessage(text);
  }

  async function handleEndConsultation() {
    if (!token) return;
    await apiPost(`/conversations/${params.conversationId}/end`, undefined, token).catch(() => {});
    setStatus("ENDED");
  }

  async function handleStartNew() {
    if (!token || !astrologer) return;
    setStartingNew(true);
    try {
      const data = await apiPost("/conversations", { astrologerId: astrologer.id, forceNew: true }, token);
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      setEndedReason(err instanceof Error ? err.message : "Unable to start a new consultation. Please try again.");
    } finally {
      setStartingNew(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (notFound || !astrologer) {
    return (
      <div className="max-w-md mx-auto text-center card p-8">
        <p className="text-slate-600">This consultation isn&apos;t available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="card p-4 mb-4 flex items-center gap-3">
        <Image
          src={astrologer.photoUrl}
          alt={astrologer.name}
          width={44}
          height={44}
          className="rounded-full bg-orange-50 object-cover w-11 h-11"
          unoptimized
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 truncate">{astrologer.name}</p>
          </div>
          <p className="text-xs text-slate-500">
            {astrologer.specialty} ·{" "}
            {status === "ACTIVE" ? (
              <span className="text-green-600">● Online</span>
            ) : (
              <span className="text-slate-400">Consultation ended</span>
            )}
          </p>
        </div>
        {status === "ACTIVE" && secondsLeft !== null && (
          <div
            className={
              "text-xs font-mono font-semibold px-2 py-1 rounded-lg shrink-0 " +
              (secondsLeft <= 60 ? "text-red-600 bg-red-50 animate-pulse" : "text-brand-dark bg-orange-50")
            }
            title="Time left in this consultation"
          >
            {formatClock(secondsLeft)}
          </div>
        )}
        {status === "ACTIVE" && (
          <button className="text-xs text-slate-500 hover:text-red-600" onClick={handleEndConsultation}>
            End Consultation
          </button>
        )}
      </div>

      {!aiConfigured && (
        <p className="text-amber-600 text-xs mb-3">
          AI not configured yet - responses are placeholders until the admin sets up the AI provider.
        </p>
      )}

      <div className="flex-1 overflow-y-auto card p-4 space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500 text-center mt-10">
            {astrologer.name} is ready when you are.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={"flex " + (m.sender === "USER" ? "justify-end" : "justify-start")}>
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line " +
                (m.sender === "USER"
                  ? "bg-brand text-white rounded-br-sm"
                  : "bg-orange-50 text-slate-700 rounded-bl-sm")
              }
            >
              {m.content}
              <p className={"text-[10px] mt-1 " + (m.sender === "USER" ? "text-white/70" : "text-slate-400")}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-orange-50 text-slate-500 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
              <span>{astrologer.name} is typing</span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="card p-3 mb-3 flex items-center justify-between gap-3 border-red-200">
          <p className="text-sm text-red-600">{sendError}</p>
          {failedInput && status === "ACTIVE" && (
            <button
              className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
              onClick={() => submitMessage(failedInput)}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {status === "ENDED" ? (
        <div className="card p-4 text-center space-y-3">
          <p className="text-sm text-slate-600">{endedReason ?? "Your consultation session has ended."}</p>
          {endedReason?.toLowerCase().includes("wallet balance") && (
            <Link href="/wallet" className="btn-secondary inline-block !py-1.5 !px-3 text-xs">
              Add Funds to Wallet
            </Link>
          )}
          <div>
            <button className="btn-primary" onClick={handleStartNew} disabled={startingNew}>
              {startingNew ? "Starting..." : "Start New Consultation"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button className="btn-primary" disabled={sending || !input.trim()}>
            {sending ? "..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
