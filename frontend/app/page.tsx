"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Branding {
  appName: string;
  tagline: string;
  aboutText: string;
}

interface Broadcast {
  id: string;
  formalizedText: string;
  mode: "MANUAL" | "AUTONOMOUS";
  createdAt: string;
}

export default function HomePage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  useEffect(() => {
    apiGet("/branding").then((d) => setBranding(d.branding)).catch(() => {});
    apiGet("/bot/broadcasts").then((d) => setBroadcasts(d.broadcasts)).catch(() => {});
  }, []);

  return (
    <div className="space-y-16">
      <section className="text-center space-y-6 py-10 rounded-3xl bg-gradient-to-b from-orange-100 via-orange-50 to-transparent -mt-4 px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-brand-dark">
          {branding?.appName ?? "Astro"}
        </h1>
        <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
          {branding?.tagline ?? "Your stars, decoded."}
        </p>
        <p className="text-slate-500 max-w-xl mx-auto text-sm">
          {branding?.aboutText}
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/chat" className="btn-primary">Chat with AstroBot</Link>
          <Link href="/predictions" className="btn-secondary">Get a Prediction</Link>
        </div>
      </section>

      {broadcasts.length > 0 && (
        <section className="card p-6 max-w-2xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-brand font-semibold mb-3">
            AstroBot says
          </h2>
          <p className="text-slate-700">{broadcasts[0].formalizedText}</p>
          <p className="text-xs text-slate-400 mt-2">
            {new Date(broadcasts[0].createdAt).toLocaleString()} ·{" "}
            {broadcasts[0].mode === "AUTONOMOUS" ? "independent insight" : "official announcement"}
          </p>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          title="Chat with AstroBot"
          desc="A real conversation - AstroBot remembers what you've told it and chats naturally."
          href="/chat"
        />
        <FeatureCard
          title="Expert Astrologers"
          desc="Browse a curated, always-fresh roster of astrologers across specialties."
          href="/astrologers"
        />
        <FeatureCard
          title="AI Predictions"
          desc="Strong, specific daily, love, career, and health readings powered by AI."
          href="/predictions"
        />
        <FeatureCard
          title="Palm Reading"
          desc="Upload a photo of your palm for a detailed AI-guided palmistry reading."
          href="/palm-reading"
        />
        <FeatureCard
          title="Remedies"
          desc="Get a mantra or scripture-based practice from the Gita and Vedas for what's troubling you."
          href="/remedies"
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card p-6 hover:border-brand/40 hover:shadow-md transition-all block">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
