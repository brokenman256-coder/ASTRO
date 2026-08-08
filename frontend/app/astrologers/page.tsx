"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

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
}

type SortKey = "top-rated" | "most-experienced" | "lowest-price" | "available-now";

export default function AstrologersPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
      <AstrologersContent />
    </Suspense>
  );
}

function AstrologersContent() {
  const searchParams = useSearchParams();
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);

  const [specialty, setSpecialty] = useState(searchParams.get("specialty") ?? "All");
  const [language, setLanguage] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sort, setSort] = useState<SortKey>("top-rated");

  useEffect(() => {
    apiGet("/astrologers")
      .then((d) => setAstrologers(d.astrologers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(
    () => ["All", ...Array.from(new Set(astrologers.map((a) => a.specialty)))],
    [astrologers]
  );
  const languages = useMemo(
    () => ["All", ...Array.from(new Set(astrologers.flatMap((a) => a.languages)))],
    [astrologers]
  );

  const filtered = useMemo(() => {
    let list = astrologers.filter(
      (a) =>
        (specialty === "All" || a.specialty === specialty) &&
        (language === "All" || a.languages.includes(language)) &&
        a.rating >= minRating &&
        a.priceRupeesPerMinute <= maxPrice
    );
    switch (sort) {
      case "most-experienced":
        list = list.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      case "lowest-price":
        list = list.sort((a, b) => a.priceRupeesPerMinute - b.priceRupeesPerMinute);
        break;
      case "available-now": // all AI astrologers are always available - shown for parity with a real marketplace
      case "top-rated":
      default:
        list = list.sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [astrologers, specialty, language, minRating, maxPrice, sort]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Our Astrologers</h1>
        <p className="text-slate-500 mt-1">Today's featured experts - a fresh selection every day.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Specialty" value={specialty} onChange={setSpecialty} options={specialties} />
        <FilterSelect label="Language" value={language} onChange={setLanguage} options={languages} />
        <div>
          <label className="text-xs text-slate-500 block mb-1">Min rating</label>
          <select className="input" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            {[0, 3, 4, 4.5].map((r) => (
              <option key={r} value={r}>{r === 0 ? "Any" : `${r}+`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Max price (₹/min)</label>
          <select className="input" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
            {[1000, 15, 20, 25].map((p) => (
              <option key={p} value={p}>{p === 1000 ? "Any" : `₹${p}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sort by</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="top-rated">Top Rated</option>
            <option value="most-experienced">Most Experienced</option>
            <option value="lowest-price">Lowest Price</option>
            <option value="available-now">Available Now</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-slate-400">No astrologers match those filters - try widening them.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((a) => (
          <AstrologerCard key={a.id} astrologer={a} />
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function AstrologerCard({ astrologer: a }: { astrologer: Astrologer }) {
  return (
    <Link href={`/astrologers/${a.id}`} className="card p-5 flex flex-col hover:shadow-md hover:border-brand/40 transition-all">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Image
            src={a.photoUrl}
            alt={a.name}
            width={64}
            height={64}
            className="rounded-full bg-orange-50 object-cover w-16 h-16"
            unoptimized
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" title="Online" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800 truncate">{a.name}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0.5">
              AI Astrologer
            </span>
          </div>
          <span className="inline-block text-xs font-medium text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 mt-1">
            {a.specialty}
          </span>
          <p className="text-xs text-slate-500 mt-1.5">
            {a.experienceYears} yrs exp · <span className="text-amber-500">★</span> {a.rating.toFixed(1)} · {a.consultationCount} consults
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{a.languages.join(", ")}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-4 line-clamp-3 flex-1">{a.bio}</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm font-semibold text-slate-700">₹{a.priceRupeesPerMinute}/min</span>
        <span className="btn-primary text-center text-sm !py-2">Chat Now</span>
      </div>
    </Link>
  );
}
