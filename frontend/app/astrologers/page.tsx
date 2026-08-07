"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiGet } from "@/lib/api";

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  bio: string;
  photoUrl: string;
}

export default function AstrologersPage() {
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/astrologers")
      .then((d) => setAstrologers(d.astrologers))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Our Astrologers</h1>
        <p className="text-slate-400 mt-1">Today's featured experts - a fresh selection every day.</p>
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {!loading && astrologers.length === 0 && (
        <p className="text-slate-400">No astrologers listed right now - check back soon.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {astrologers.map((a) => (
          <div key={a.id} className="card p-6 flex flex-col items-center text-center">
            <Image
              src={a.photoUrl}
              alt={a.name}
              width={80}
              height={80}
              className="rounded-full bg-white/10 mb-4"
              unoptimized
            />
            <h3 className="font-semibold text-white">{a.name}</h3>
            <p className="text-xs text-brand-light mt-1">{a.specialty}</p>
            <p className="text-xs text-slate-500 mt-1">{a.experienceYears} yrs · ★ {a.rating.toFixed(1)}</p>
            <p className="text-sm text-slate-400 mt-3">{a.bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
