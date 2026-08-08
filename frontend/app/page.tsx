"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { ZODIAC_DATA } from "@/lib/zodiac";

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

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  photoUrl: string;
  languages: string[];
  priceRupeesPerMinute: number;
  consultationCount: number;
}

const CATEGORIES = [
  { label: "Love & Relationships", specialty: "Love & Relationships" },
  { label: "Marriage", specialty: "Marriage & Relationships" },
  { label: "Career", specialty: "Career & Finance" },
  { label: "Finance", specialty: "Career & Finance" },
  { label: "Family", specialty: "Family & Vastu" },
  { label: "Vedic Astrology", specialty: "Vedic Astrology" },
  { label: "Numerology", specialty: "Numerology" },
  { label: "Tarot", specialty: "Tarot Reading" },
];

const WHY_ASTRO = [
  { title: "AI Astrologers, Always On", desc: "Every astrologer is available 24/7 - no waiting for a human to come online." },
  { title: "Independent Personas", desc: "Each astrologer has their own personality and memory - conversations never cross over." },
  { title: "Private by Design", desc: "Your consultations are yours alone - no one else can access your conversation history." },
  { title: "Transparent AI", desc: "Every astrologer is clearly labeled AI - no confusion about who you're talking to." },
];

const TESTIMONIALS = [
  { name: "Priya S.", text: "Meera understood exactly what I was going through and gave me real clarity on my relationship." },
  { name: "Rohan M.", text: "Rajiv's career guidance was refreshingly direct - no fluff, just useful perspective." },
  { name: "Ananya K.", text: "I love that I can talk to Aarav any time of night. The detail in his readings surprised me." },
];

const FAQS = [
  { q: "Is this a real human astrologer?", a: "No - every astrologer on Astro is an AI persona, clearly labeled \"AI Astrologer\". They're designed for entertainment and reflection, not licensed professional advice." },
  { q: "How does my conversation stay private?", a: "Each consultation is tied to your account and that specific astrologer. No one else can view it, and it never mixes with another astrologer's conversation." },
  { q: "Is there a limit to how much I can chat?", a: "Yes - each consultation has a message and time limit, and there's a daily limit across the platform, both configurable by the site admin, to keep things sustainable." },
  { q: "Can I switch between astrologers?", a: "Absolutely - browse the marketplace and start a fresh consultation with anyone, any time. Your history with each astrologer is kept separate." },
];

export default function HomePage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [allAstrologers, setAllAstrologers] = useState<Astrologer[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    apiGet("/branding").then((d) => setBranding(d.branding)).catch(() => {});
    apiGet("/bot/broadcasts").then((d) => setBroadcasts(d.broadcasts)).catch(() => {});
    apiGet("/astrologers").then((d) => setAllAstrologers(d.astrologers)).catch(() => {});
  }, []);

  const featured = allAstrologers.slice(0, 3);
  const totalConsultations = allAstrologers.reduce((sum, a) => sum + (a.consultationCount ?? 0), 0);

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section
        className="star-field relative overflow-hidden text-center space-y-6 py-20 rounded-3xl -mt-4 px-4 shadow-2xl shadow-black/30"
        style={{ backgroundImage: "linear-gradient(160deg, #1e2340, #2a1030 55%, #1e2340)" }}
      >
        <div className="glow-orb w-72 h-72 bg-maroon/40 -top-20 -left-10 animate-pulse-slow" />
        <div className="glow-orb w-80 h-80 bg-gold/25 -top-10 -right-16 animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
        <div className="relative">
          <h1 className="font-display text-5xl md:text-7xl font-extrabold text-gold-foil tracking-tight animate-fade-up">
            {branding?.appName ?? "ASTRO"}
          </h1>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto font-medium mt-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {branding?.tagline ?? "Your stars, decoded."}
          </p>
          <p className="text-slate-400 max-w-xl mx-auto text-sm mt-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {branding?.aboutText ??
              "Discover personalized astrology guidance, predictions, palm reading and consultations."}
          </p>
          <div className="flex justify-center gap-4 pt-6 flex-wrap animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/astrologers" className="btn-primary">Chat with an Astrologer</Link>
            <Link href="/predictions" className="btn-secondary !bg-white/10 !text-gold !border-gold/30 hover:!bg-white/20">Get a Prediction</Link>
          </div>
        </div>
      </section>

      {allAstrologers.length > 0 && (
        <section className="flex flex-wrap justify-center gap-x-10 gap-y-4 -mt-10">
          <LiveStat value={allAstrologers.length.toString()} label="Astrologers Online Now" pulse />
          <LiveStat value={totalConsultations.toLocaleString()} label="Consultations So Far" />
          <LiveStat value="24/7" label="Always Available" />
        </section>
      )}

      {broadcasts.length > 0 && (
        <section className="card p-6 max-w-2xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-brand font-semibold mb-3">AstroBot says</h2>
          <p className="text-slate-700">{broadcasts[0].formalizedText}</p>
          <p className="text-xs text-slate-400 mt-2">
            {new Date(broadcasts[0].createdAt).toLocaleString()} ·{" "}
            {broadcasts[0].mode === "AUTONOMOUS" ? "independent insight" : "official announcement"}
          </p>
        </section>
      )}

      {/* Featured Astrologers */}
      <section>
        <SectionHeader title="Featured Astrologers" subtitle="A few of today's top-rated experts" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {featured.map((a) => (
            <Link key={a.id} href={`/astrologers/${a.id}`} className="card-royal card-interactive p-5 flex flex-col">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <Image src={a.photoUrl} alt={a.name} width={56} height={56} className="rounded-full bg-orange-50 object-cover w-14 h-14" unoptimized />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                  <p className="text-xs text-brand-dark">{a.specialty}</p>
                  <p className="text-xs text-slate-500 mt-1">{a.experienceYears} yrs · ★ {a.rating.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-semibold text-gold-foil">₹{a.priceRupeesPerMinute}/min</span>
                <span className="btn-primary !py-1.5 !px-3 text-xs">Chat Now</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/astrologers" className="text-sm text-brand-dark font-medium hover:underline">
            View all astrologers →
          </Link>
        </div>
      </section>

      {/* Popular Categories */}
      <section>
        <SectionHeader title="Popular Categories" subtitle="Find the right astrologer for what's on your mind" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              href={`/astrologers?specialty=${encodeURIComponent(c.specialty)}`}
              className="card p-4 text-center hover:shadow-md hover:border-brand/40 transition-all"
            >
              <p className="text-sm font-medium text-slate-700">{c.label}</p>
            </Link>
          ))}
          <Link href="/astrologers" className="card p-4 text-center hover:shadow-md hover:border-brand/40 transition-all">
            <p className="text-sm font-medium text-slate-700">Education</p>
          </Link>
          <Link href="/palm-reading" className="card p-4 text-center hover:shadow-md hover:border-brand/40 transition-all">
            <p className="text-sm font-medium text-slate-700">Palm Reading</p>
          </Link>
        </div>
      </section>

      {/* Today's Predictions */}
      <section>
        <SectionHeader title="Today's Predictions" subtitle="A quick look at what the stars say" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {ZODIAC_DATA.slice(0, 4).map((z) => (
            <Link key={z.name} href={`/predictions/${z.name.toLowerCase()}`} className="card p-4 text-center hover:shadow-md hover:border-brand/40 transition-all">
              <p className="text-3xl">{z.symbol}</p>
              <p className="text-sm font-medium text-slate-700 mt-1">{z.name}</p>
              <p className="text-xs text-slate-400">{z.dateRange}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/predictions" className="text-sm text-brand-dark font-medium hover:underline">
            See all zodiac predictions →
          </Link>
        </div>
      </section>

      {/* Reading tools teasers */}
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Link href="/kundli" className="card p-8 hover:shadow-md hover:border-brand/40 transition-all">
          <h3 className="text-lg font-semibold text-slate-800">Kundli</h3>
          <p className="text-sm text-slate-500 mt-2">Get your Vedic birth chart reading, or check compatibility with someone through Kundli matching.</p>
          <span className="inline-block mt-4 text-sm text-brand-dark font-medium">Generate my Kundli →</span>
        </Link>
        <Link href="/panchang" className="card p-8 hover:shadow-md hover:border-brand/40 transition-all">
          <h3 className="text-lg font-semibold text-slate-800">Panchang & Luck Meter</h3>
          <p className="text-sm text-slate-500 mt-2">Today&apos;s Vedic almanac plus your own personal luck score for the day.</p>
          <span className="inline-block mt-4 text-sm text-brand-dark font-medium">Check today →</span>
        </Link>
        <Link href="/tarot" className="card p-8 hover:shadow-md hover:border-brand/40 transition-all">
          <h3 className="text-lg font-semibold text-slate-800">Tarot Reading</h3>
          <p className="text-sm text-slate-500 mt-2">Draw your cards and get a detailed AI-guided tarot reading for whatever&apos;s on your mind.</p>
          <span className="inline-block mt-4 text-sm text-brand-dark font-medium">Draw cards →</span>
        </Link>
        <Link href="/palm-reading" className="card p-8 hover:shadow-md hover:border-brand/40 transition-all">
          <h3 className="text-lg font-semibold text-slate-800">Palm Reading</h3>
          <p className="text-sm text-slate-500 mt-2">Upload a photo of your palm for a detailed AI-guided reading of your life, head, heart, and fate lines.</p>
          <span className="inline-block mt-4 text-sm text-brand-dark font-medium">Try it now →</span>
        </Link>
        <Link href="/remedies" className="card p-8 hover:shadow-md hover:border-brand/40 transition-all">
          <h3 className="text-lg font-semibold text-slate-800">Remedies</h3>
          <p className="text-sm text-slate-500 mt-2">Get a mantra or scripture-based practice from the Gita and Vedas for career, focus, peace, and more.</p>
          <span className="inline-block mt-4 text-sm text-brand-dark font-medium">Explore remedies →</span>
        </Link>
      </section>

      {/* Why Astro */}
      <section>
        <SectionHeader title="Why Astro" subtitle="A consultation platform built around clarity and trust" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {WHY_ASTRO.map((w) => (
            <div key={w.title} className="card p-5">
              <h3 className="font-semibold text-slate-800 text-sm">{w.title}</h3>
              <p className="text-xs text-slate-500 mt-2">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <SectionHeader title="What People Are Saying" subtitle="" />
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card p-5">
              <p className="text-sm text-slate-600 italic">&ldquo;{t.text}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-3 font-medium">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto">
        <SectionHeader title="Frequently Asked Questions" subtitle="" />
        <div className="space-y-3 mt-6">
          {FAQS.map((f, i) => (
            <div key={f.q} className="card overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-sm font-medium text-slate-700">{f.q}</span>
                <span className="text-brand-dark text-lg">{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && <p className="text-sm text-slate-500 px-5 pb-4">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-navy">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function LiveStat({ value, label, pulse }: { value: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {pulse && <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse-slow" />}
      <div className="text-left">
        <p className="font-display text-lg font-bold text-maroon leading-none">{value}</p>
        <p className="text-[11px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  );
}
