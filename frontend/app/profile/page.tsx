"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { clearUserSession, setUserSession } from "@/lib/session";

interface ConversationSummary {
  id: string;
  status: "ACTIVE" | "ENDED";
  messageCount: number;
  startedAt: string;
  updatedAt: string;
  astrologer: { id: string; name: string; photoUrl: string; specialty: string };
}

interface FullUser {
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<FullUser | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/auth/me")
      .then((d) => {
        setUser(d.user);
        setUserSession(d.user);
      })
      .catch(() => {
        router.push("/login");
      });
    apiGet("/conversations")
      .then((d) => setConversations(d.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await apiPost("/auth/logout").catch(() => {});
    clearUserSession();
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="card p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-100 text-brand-dark flex items-center justify-center text-2xl font-bold mx-auto">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mt-4">{user.name}</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
          {user.phone && <span>{user.phone}</span>}
          {user.dob && <span>Born {new Date(user.dob).toLocaleDateString()}</span>}
        </div>
        <button className="btn-secondary mt-4 !py-1.5 !px-4 text-sm" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="flex gap-3">
        <Link href="/wallet" className="card p-4 flex-1 text-center hover:border-brand/40 transition-all">
          <p className="text-sm font-medium text-slate-700">Wallet</p>
        </Link>
        <Link href="/astrologers" className="card p-4 flex-1 text-center hover:border-brand/40 transition-all">
          <p className="text-sm font-medium text-slate-700">Browse Astrologers</p>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Consultation history</h2>
        {loading && <p className="text-slate-400">Loading...</p>}
        {!loading && conversations.length === 0 && (
          <p className="text-sm text-slate-500">
            No consultations yet.{" "}
            <Link href="/astrologers" className="text-brand-dark font-medium hover:underline">
              Talk to an astrologer
            </Link>
            .
          </p>
        )}
        <div className="space-y-3">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="card p-4 flex items-center gap-3 hover:border-brand/40 transition-all"
            >
              <Image
                src={c.astrologer.photoUrl}
                alt={c.astrologer.name}
                width={44}
                height={44}
                className="rounded-full w-11 h-11 object-cover bg-orange-50"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{c.astrologer.name}</p>
                <p className="text-xs text-slate-500 truncate">{c.astrologer.specialty}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(c.startedAt).toLocaleDateString()} · {c.messageCount} messages
                </p>
              </div>
              <span
                className={
                  "text-xs px-2 py-1 rounded-full shrink-0 " +
                  (c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")
                }
              >
                {c.status === "ACTIVE" ? "Active" : "Ended"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
