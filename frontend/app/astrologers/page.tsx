"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        <h1 className="text-3xl font-bold text-slate-800">Our Astrologers</h1>
        <p className="text-slate-500 mt-1">Today's featured experts - a fresh selection every day.</p>
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {!loading && astrologers.length === 0 && (
        <p className="text-slate-400">No astrologers listed right now - check back soon.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {astrologers.map((a) => (
          <div key={a.id} className="card p-5 flex flex-col">
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
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{a.name}</h3>
                <span className="inline-block text-xs font-medium text-brand-dark bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 mt-1">
                  {a.specialty}
                </span>
                <p className="text-xs text-slate-500 mt-1.5">
                  {a.experienceYears} yrs exp · <span className="text-amber-500">★</span> {a.rating.toFixed(1)}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 line-clamp-3 flex-1">{a.bio}</p>
            <Link href="/chat" className="btn-primary text-center text-sm mt-4 !py-2">
              Chat Now
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
