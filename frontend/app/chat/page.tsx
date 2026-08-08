"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface ChatMessage {
  id: string;
  role: "USER" | "BOT";
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = getUserToken();
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    apiGet("/chat/history", t).then((d) => setMessages(d.messages));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || sending) return;

    const text = input;
    setInput("");
    setSending(true);

    // Optimistically show the user's message right away.
    const optimisticUser: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const data = await apiPost("/chat/message", { message: text }, token);
      setAiConfigured(data.aiConfigured);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        data.userMessage,
        data.botMessage,
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  if (!token) return null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Chat with AstroBot</h1>
        <p className="text-slate-500 text-sm mt-1">
          Just talk - AstroBot remembers your conversation and chats naturally.
        </p>
        {!aiConfigured && (
          <p className="text-amber-600 text-xs mt-2">
            AI not configured yet - responses are placeholders until the admin sets ANTHROPIC_API_KEY.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto card p-4 space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500 text-center mt-10">
            Say hi to start the conversation.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={"flex " + (m.role === "USER" ? "justify-end" : "justify-start")}>
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line " +
                (m.role === "USER"
                  ? "bg-brand text-white rounded-br-sm"
                  : "bg-orange-50 text-slate-700 rounded-bl-sm")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-orange-50 text-slate-500 rounded-2xl rounded-bl-sm px-4 py-2 text-sm">
              AstroBot is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button className="btn-primary" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
