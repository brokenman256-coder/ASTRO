"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface PalmReading {
  id: string;
  imageData: string;
  resultText: string;
  createdAt: string;
  user: { name: string; email: string } | null;
}

interface TarotReading {
  id: string;
  cards: string[];
  question: string | null;
  resultText: string;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function MediaLibraryPage() {
  const [tab, setTab] = useState<"palm" | "tarot">("palm");
  const [palm, setPalm] = useState<PalmReading[]>([]);
  const [tarot, setTarot] = useState<TarotReading[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getAdminToken();

  useEffect(() => {
    Promise.all([
      apiGet("/media/admin/palm", token).then((d) => setPalm(d.readings)),
      apiGet("/media/admin/tarot", token).then((d) => setTarot(d.readings)),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Media library</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">
        Every uploaded palm photo and tarot draw across all users, for oversight and quality
        checking the AI readings. Not visible to other users.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          className={"text-sm px-3 py-1.5 rounded-lg " + (tab === "palm" ? "bg-brand text-white" : "text-slate-500 hover:bg-orange-50")}
          onClick={() => setTab("palm")}
        >
          Palm photos ({palm.length})
        </button>
        <button
          className={"text-sm px-3 py-1.5 rounded-lg " + (tab === "tarot" ? "bg-brand text-white" : "text-slate-500 hover:bg-orange-50")}
          onClick={() => setTab("tarot")}
        >
          Tarot draws ({tarot.length})
        </button>
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}

      {!loading && tab === "palm" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {palm.length === 0 && <p className="text-slate-500 text-sm">No palm photos uploaded yet.</p>}
          {palm.map((p) => (
            <div key={p.id} className="card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageData} alt="Palm" className="w-full aspect-square object-cover rounded-lg mb-2" />
              <p className="text-xs text-slate-500 truncate">{p.user ? `${p.user.name} (${p.user.email})` : "Guest"}</p>
              <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-2 line-clamp-3">{p.resultText}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "tarot" && (
        <div className="space-y-3">
          {tarot.length === 0 && <p className="text-slate-500 text-sm">No tarot draws yet.</p>}
          {tarot.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800">{t.cards.join(" · ")}</p>
                <p className="text-xs text-slate-400 shrink-0">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-xs text-slate-500 mb-1">{t.user ? `${t.user.name} (${t.user.email})` : "Guest"}{t.question ? ` · "${t.question}"` : ""}</p>
              <p className="text-xs text-slate-600 line-clamp-3">{t.resultText}</p>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  );
}
