"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface Overview {
  userCount: number;
  activeAstrologers: number;
  pendingTx: number;
  predictionCount: number;
  palmReadingCount: number;
  latestBroadcast: { formalizedText: string; mode: string; createdAt: string } | null;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    apiGet("/admin/overview", getAdminToken()).then(setData).catch(() => {});
  }, []);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-6">Dashboard overview</h1>
      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat label="Users" value={data.userCount} />
          <Stat label="Active astrologers" value={data.activeAstrologers} />
          <Stat label="Pending wallet requests" value={data.pendingTx} highlight={data.pendingTx > 0} />
          <Stat label="Predictions served" value={data.predictionCount} />
          <Stat label="Palm readings served" value={data.palmReadingCount} />
        </div>
      )}
      {data?.latestBroadcast && (
        <div className="card p-6 mt-8">
          <h2 className="text-sm uppercase tracking-widest text-brand-light mb-2">Latest AstroBot broadcast</h2>
          <p className="text-slate-200">{data.latestBroadcast.formalizedText}</p>
          <p className="text-xs text-slate-500 mt-2">
            {data.latestBroadcast.mode} · {new Date(data.latestBroadcast.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </AdminGuard>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={"card p-5 " + (highlight ? "border-amber-400/40" : "")}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={"text-2xl font-semibold mt-1 " + (highlight ? "text-amber-400" : "text-white")}>{value}</p>
    </div>
  );
}
