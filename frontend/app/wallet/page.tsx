"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { getUserToken } from "@/lib/session";

interface Transaction {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referenceCode: string;
  createdAt: string;
}

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function WalletPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [minRechargePaise, setMinRechargePaise] = useState(10000);
  const [amount, setAmount] = useState("500");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
  const quickAmounts = Array.from(new Set([minRechargeRupees, minRechargeRupees * 2, minRechargeRupees * 5]));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Wallet</h1>
        <p className="text-slate-500 mt-1">
          Current balance: <span className="text-slate-800 font-medium">{balance !== null ? rupees(balance) : "..."}</span>
        </p>
      </div>

      <form onSubmit={handleTopup} className="card p-6 space-y-4">
        <h2 className="font-medium">Add money</h2>
        <p className="text-xs text-slate-500">Minimum recharge: ₹{minRechargeRupees.toFixed(0)}</p>
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setAmount(r.toFixed(0))}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (Number(amount) === r
                  ? "bg-brand text-white border-brand"
                  : "bg-orange-50 text-slate-600 border-orange-200 hover:bg-orange-100")
              }
            >
              ₹{r.toFixed(0)}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Amount (₹)</label>
            <input
              className="input"
              type="number"
              min={minRechargeRupees}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Generate QR"}
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

      <div className="card p-6">
        <h2 className="font-medium mb-4">Transaction history</h2>
        {transactions.length === 0 && <p className="text-sm text-slate-500">No transactions yet.</p>}
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex justify-between items-center text-sm border-b border-orange-100 py-2">
              <div>
                <p className="text-slate-700">{rupees(t.amount)}</p>
                <p className="text-xs text-slate-500">{t.referenceCode} · {new Date(t.createdAt).toLocaleDateString()}</p>
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
      </div>
    </div>
  );
}
