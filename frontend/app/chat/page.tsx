"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
  rating: number;
}

interface ConversationSummary {
  id: string;
  status: "ACTIVE" | "ENDED";
  updatedAt: string;
  astrologer: { id: string; name: string; photoUrl: string; specialty: string };
}

export default function ChatLandingPage() {
  const router = useRouter();
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [recent, setRecent] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const token = getUserToken();
    apiGet("/astrologers")
      .then((d) => setAstrologers(d.astrologers.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (token) {
      apiGet("/conversations", token)
        .then((d) => setRecent(d.conversations.filter((c: ConversationSummary) => c.status === "ACTIVE").slice(0, 3)))
        .catch(() => {});
    }
  }, []);

  async function quickStart(astrologerId: string) {
    const token = getUserToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setStarting(astrologerId);
    try {
      const data = await apiPost("/conversations", { astrologerId }, token);
      router.push(`/chat/${data.conversation.id}`);
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Chat with an Astrologer</h1>
        <p className="text-slate-500 mt-1">Pick an astrologer to begin a private consultation.</p>
      </div>

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-brand font-semibold mb-3">Continue a consultation</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {recent.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`} className="card p-4 flex items-center gap-3 hover:border-brand/40 transition-all">
                <Image src={c.astrologer.photoUrl} alt={c.astrologer.name} width={40} height={40} className="rounded-full w-10 h-10 object-cover bg-orange-50" unoptimized />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.astrologer.name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.astrologer.specialty}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-widest text-brand font-semibold mb-3">Start a new consultation</h2>
        {loading && <p className="text-slate-400">Loading...</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {astrologers.map((a) => (
            <div key={a.id} className="card p-4 flex items-center gap-3">
              <Image src={a.photoUrl} alt={a.name} width={48} height={48} className="rounded-full w-12 h-12 object-cover bg-orange-50" unoptimized />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                <p className="text-xs text-slate-500 truncate">{a.specialty} · ★ {a.rating.toFixed(1)}</p>
              </div>
              <button
                className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                onClick={() => quickStart(a.id)}
                disabled={starting === a.id}
              >
                {starting === a.id ? "..." : "Chat"}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/astrologers" className="text-sm text-brand-dark font-medium hover:underline">
            Browse all astrologers →
          </Link>
        </div>
      </section>
    </div>
  );
}
