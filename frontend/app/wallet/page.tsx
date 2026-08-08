"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface Transaction {
  id: string;
  amount: number;
  bonusPaise: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referenceCode: string;
  note: string | null;
  createdAt: string;
}

interface Scheme {
  id: string;
  label: string;
  minAmountPaise: number;
  bonusPercent: number;
}

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

const LOW_BALANCE_THRESHOLD_PAISE = 10000; // ₹100 - nudges the user to top up

export default function WalletPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [minRechargePaise, setMinRechargePaise] = useState(10000);
  const [amount, setAmount] = useState("500");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const t = getUserToken();
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    refresh(t);
    apiGet("/wallet/payment-settings")
      .then((d) => {
        setMinRechargePaise(d.minRechargeAmountPaise);
        setAmount((d.minRechargeAmountPaise / 100).toFixed(0));
      })
      .catch(() => {});
    apiGet("/wallet/schemes")
      .then((d) => setSchemes(d.schemes))
      .catch(() => {});
  }, [router]);

  async function refresh(t: string) {
    const [bal, tx] = await Promise.all([
      apiGet("/wallet/balance", t),
      apiGet("/wallet/transactions", t),
    ]);
    setBalance(bal.balancePaise);
    setTransactions(tx.transactions);
  }

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);
    setQrDataUrl(null);
    try {
      const amountPaise = Math.round(parseFloat(amount) * 100);
      const data = await apiPost("/wallet/topup-request", { amountPaise }, token);
      setQrDataUrl(data.qrDataUrl);
      setReference(data.transaction.referenceCode);
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  const minRechargeRupees = minRechargePaise / 100;
  const isLowBalance = balance !== null && balance < LOW_BALANCE_THRESHOLD_PAISE;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Balance - the one number that matters, up front */}
      <div className="card-royal p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">Wallet Balance</p>
        <p className="font-display text-5xl font-bold text-navy mt-2">
          {balance !== null ? rupees(balance) : "..."}
        </p>
        {isLowBalance && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-full inline-block px-4 py-1.5 mt-4">
            Running low - recharge below so a consultation is never interrupted.
          </p>
        )}
      </div>

      {/* Offers - the primary way to pick an amount */}
      {schemes.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-navy text-center mb-1">Recharge Offers</h2>
          <p className="text-xs text-slate-500 text-center mb-4">Pick an offer, or enter your own amount below</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {schemes.map((s) => {
              const selected = selectedSchemeId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSchemeId(s.id);
                    setAmount((s.minAmountPaise / 100).toFixed(0));
                  }}
                  className={
                    "card-royal p-4 text-left transition-all " +
                    (selected ? "ring-2 ring-maroon" : "hover:-translate-y-0.5")
                  }
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">{s.label}</p>
                  <p className="text-gold-foil text-2xl font-display font-bold mt-1">+{s.bonusPercent}%</p>
                  <p className="text-xs text-slate-500 mt-1">bonus on ₹{(s.minAmountPaise / 100).toFixed(0)}+</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recharge form - simple, single amount field */}
      <form id="recharge" onSubmit={handleTopup} className="card p-6 space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recharge amount</h2>
          <p className="text-xs text-slate-400">Min ₹{minRechargeRupees.toFixed(0)}</p>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                className="input !pl-7 text-lg font-semibold"
                type="number"
                min={minRechargeRupees}
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSelectedSchemeId(null);
                }}
                required
              />
            </div>
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Get QR"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {qrDataUrl && (
        <div className="card p-6 text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Payment QR code" className="mx-auto rounded-xl bg-white p-3" width={220} height={220} />
          <p className="text-sm text-slate-500">
            Scan to pay, then wait for admin approval. Reference: <span className="text-slate-800">{reference}</span>
          </p>
          <p className="text-xs text-amber-600">
            Demo mode: this QR simulates a payment flow. Your balance updates once an admin approves the request.
          </p>
        </div>
      )}

      {/* History - collapsed by default to keep the page focused */}
      <div className="card p-6">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowHistory((v) => !v)}
        >
          <h2 className="font-medium">Transaction history</h2>
          <span className="text-brand-dark text-sm">{showHistory ? "Hide −" : "Show +"}</span>
        </button>
        {showHistory && (
          <div className="space-y-2 mt-4">
            {transactions.length === 0 && <p className="text-sm text-slate-500">No transactions yet.</p>}
            {transactions.map((t) => (
              <div key={t.id} className="flex justify-between items-center text-sm border-b border-orange-100 py-2">
                <div>
                  <p className="text-slate-700">
                    {rupees(t.amount)}
                    {t.bonusPaise > 0 && <span className="text-green-600"> + {rupees(t.bonusPaise)} bonus</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.referenceCode} · {new Date(t.createdAt).toLocaleDateString()}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={
                    "text-xs px-2 py-1 rounded-full " +
                    (t.status === "APPROVED"
                      ? "bg-green-500/20 text-green-600"
                      : t.status === "REJECTED"
                      ? "bg-red-500/20 text-red-600"
                      : "bg-amber-500/20 text-amber-600")
                  }
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
