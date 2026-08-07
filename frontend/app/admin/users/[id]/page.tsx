"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  createdAt: string;
}

interface Prediction {
  id: string;
  category: string;
  zodiacSign: string;
  resultText: string;
  createdAt: string;
}

interface PalmReading {
  id: string;
  imageData: string;
  resultText: string;
  createdAt: string;
}

interface Remedy {
  id: string;
  concern: string;
  resultText: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  referenceCode: string;
  createdAt: string;
}

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [palmReadings, setPalmReadings] = useState<PalmReading[]>([]);
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/admin/users/${params.id}/detail`, getAdminToken())
      .then((d) => {
        setUser(d.user);
        setPredictions(d.predictions);
        setPalmReadings(d.palmReadings);
        setRemedies(d.remedies);
        setTransactions(d.transactions);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AdminGuard>
      <AdminNav />
      <Link href="/admin/users" className="text-xs text-slate-500 hover:text-slate-300">← All users</Link>

      {loading && <p className="text-slate-400 mt-4">Loading...</p>}
      {!loading && !user && <p className="text-slate-500 mt-4">User not found.</p>}

      {user && (
        <>
          <div className="card p-6 mt-4 mb-8">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="text-sm text-slate-400">{user.email}</p>
            <div className="flex gap-6 mt-3 text-sm">
              <p>Wallet: <span className="text-white">{rupees(user.walletBalance)}</span></p>
              <p>Joined: <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span></p>
            </div>
          </div>

          <Section title={`Palm readings (${palmReadings.length})`}>
            {palmReadings.length === 0 && <Empty />}
            <div className="grid sm:grid-cols-2 gap-4">
              {palmReadings.map((p) => (
                <div key={p.id} className="card p-4">
                  <a href={p.imageData} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageData} alt="Uploaded palm" className="rounded-lg w-full max-h-48 object-cover mb-3" />
                  </a>
                  <p className="text-xs text-slate-500 mb-1">{new Date(p.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-line line-clamp-6">{p.resultText}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Predictions (${predictions.length})`}>
            {predictions.length === 0 && <Empty />}
            <div className="space-y-3">
              {predictions.map((p) => (
                <div key={p.id} className="card p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    {p.category} · {p.zodiacSign} · {new Date(p.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-300 whitespace-pre-line">{p.resultText}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Remedies (${remedies.length})`}>
            {remedies.length === 0 && <Empty />}
            <div className="space-y-3">
              {remedies.map((r) => (
                <div key={r.id} className="card p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    &quot;{r.concern}&quot; · {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-300 whitespace-pre-line">{r.resultText}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Wallet transactions (${transactions.length})`}>
            {transactions.length === 0 && <Empty />}
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-200">{rupees(t.amount)} <span className="text-xs text-slate-500">· {t.referenceCode}</span></p>
                    <p className="text-xs text-slate-500">{t.type} · {new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <span
                    className={
                      "text-xs px-2 py-1 rounded-full " +
                      (t.status === "APPROVED"
                        ? "bg-green-500/20 text-green-400"
                        : t.status === "REJECTED"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400")
                    }
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </AdminGuard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-500">Nothing here yet.</p>;
}
