"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  astrologyStyle: string;
  experienceYears: number;
  rating: number;
  bio: string;
  photoUrl: string;
  languages: string[];
  priceRupeesPerMinute: number;
  consultationCount: number;
  personality: string;
  greeting: string;
}

export default function AstrologerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [needsFunds, setNeedsFunds] = useState(false);
  const [minSessionMinutes, setMinSessionMinutes] = useState(5);

  useEffect(() => {
    apiGet(`/astrologers/${params.id}`)
      .then((d) => setAstrologer(d.astrologer))
      .catch(() => setAstrologer(null))
      .finally(() => setLoading(false));
    apiGet("/wallet/payment-settings")
      .then((d) => setMinSessionMinutes(d.minSessionMinutes))
      .catch(() => {});
  }, [params.id]);

  async function handleStartConsultation() {
    const token = getUserToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setStarting(true);
    setError("");
    setNeedsFunds(false);
    try {
      const data = await apiPost("/conversations", { astrologerId: params.id }, token);
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start consultation. Please try again.";
      setError(message);
      setNeedsFunds(message.toLowerCase().includes("add funds"));
      setStarting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (!astrologer) return <p className="text-slate-400">Astrologer not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card p-8 text-center">
        <Image
          src={astrologer.photoUrl}
          alt={astrologer.name}
          width={112}
          height={112}
          className="rounded-full bg-orange-50 object-cover w-28 h-28 mx-auto"
          unoptimized
        />
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800">{astrologer.name}</h1>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0.5">
            AI Astrologer
          </span>
        </div>
        <span className="inline-block text-sm font-medium text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-3 py-1 mt-2">
          {astrologer.specialty}
        </span>
        <p className="text-sm text-slate-500 mt-3">
          <span className="text-amber-500">★</span> {astrologer.rating.toFixed(1)} · {astrologer.experienceYears} yrs experience · {astrologer.consultationCount} consultations
        </p>
        <p className="text-sm text-slate-500 mt-1">Speaks: {astrologer.languages.join(", ")}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-2">About {astrologer.name}</h2>
        <p className="text-sm text-slate-600">{astrologer.bio}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-2">Areas of Expertise</h2>
        <p className="text-sm text-slate-600">{astrologer.astrologyStyle} · {astrologer.specialty}</p>
        <p className="text-xs text-slate-400 mt-2">{astrologer.personality}</p>
      </div>

      <div className="card p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-500">Consultation price</p>
          <p className="text-xl font-bold text-slate-800">₹{astrologer.priceRupeesPerMinute}/min</p>
          <p className="text-xs text-slate-400 mt-0.5">
            ₹{astrologer.priceRupeesPerMinute * minSessionMinutes} minimum for a {minSessionMinutes}-min session
          </p>
        </div>
        {error && (
          <div className="text-sm w-full space-y-2">
            <p className="text-red-600">{error}</p>
            {needsFunds && (
              <Link href="/wallet" className="btn-secondary inline-block !py-1.5 !px-3 text-xs">
                Add Funds to Wallet
              </Link>
            )}
          </div>
        )}
        <button className="btn-primary" onClick={handleStartConsultation} disabled={starting}>
          {starting ? "Connecting..." : "Chat Now"}
        </button>
      </div>
    </div>
  );
}
