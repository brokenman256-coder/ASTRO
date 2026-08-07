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
      <section className="text-center space-y-6 py-10">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-brand-light via-white to-accent bg-clip-text text-transparent">
          {branding?.appName ?? "Astro"}
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          {branding?.tagline ?? "Your stars, decoded."}
        </p>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          {branding?.aboutText}
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/predictions" className="btn-primary">Get a Prediction</Link>
          <Link href="/palm-reading" className="btn-secondary">Try Palm Reading</Link>
        </div>
      </section>

      {broadcasts.length > 0 && (
        <section className="card p-6 max-w-2xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-brand-light mb-3">
            AstroBot says
          </h2>
          <p className="text-slate-200">{broadcasts[0].formalizedText}</p>
          <p className="text-xs text-slate-500 mt-2">
            {new Date(broadcasts[0].createdAt).toLocaleString()} ·{" "}
            {broadcasts[0].mode === "AUTONOMOUS" ? "independent insight" : "official announcement"}
          </p>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-6">
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
    <Link href={href} className="card p-6 hover:border-brand-light/50 transition-colors block">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{desc}</p>
    </Link>
  );
}
