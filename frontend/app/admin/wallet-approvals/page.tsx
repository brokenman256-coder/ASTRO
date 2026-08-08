"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface PendingTx {
  id: string;
  amount: number;
  referenceCode: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface PaymentSettings {
  minRechargeAmountPaise: number;
  minSessionMinutes: number;
}

interface Scheme {
  id: string;
  label: string;
  minAmountPaise: number;
  bonusPercent: number;
  isFirstTimeOnly: boolean;
  active: boolean;
}

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function WalletApprovalsPage() {
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [newScheme, setNewScheme] = useState({ label: "", minAmountPaise: 50000, bonusPercent: 10, isFirstTimeOnly: false });
  const [schemeBusy, setSchemeBusy] = useState(false);
  const token = getAdminToken();

  async function refresh() {
    const data = await apiGet("/wallet/admin/pending", token);
    setPending(data.pending);
  }

  async function refreshSchemes() {
    const data = await apiGet("/wallet/admin/schemes", token);
    setSchemes(data.schemes);
  }

  useEffect(() => {
    refresh();
    refreshSchemes();
    apiGet("/wallet/admin/payment-settings", token).then((d) => setSettings(d.settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createScheme(e: React.FormEvent) {
    e.preventDefault();
    if (!newScheme.label.trim()) return;
    setSchemeBusy(true);
    try {
      await apiPost("/wallet/admin/schemes", newScheme, token);
      setNewScheme({ label: "", minAmountPaise: 50000, bonusPercent: 10, isFirstTimeOnly: false });
      await refreshSchemes();
    } finally {
      setSchemeBusy(false);
    }
  }

  async function toggleScheme(scheme: Scheme) {
    setSchemeBusy(true);
    try {
      await apiPatch(`/wallet/admin/schemes/${scheme.id}`, { active: !scheme.active }, token);
      await refreshSchemes();
    } finally {
      setSchemeBusy(false);
    }
  }

  async function deleteScheme(id: string) {
    setSchemeBusy(true);
    try {
      await apiDelete(`/wallet/admin/schemes/${id}`, token);
      await refreshSchemes();
    } finally {
      setSchemeBusy(false);
    }
  }

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await apiPost(`/wallet/admin/${id}/${action}`, undefined, token);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const data = await apiPut("/wallet/admin/payment-settings", settings, token);
      setSettings({
        minRechargeAmountPaise: data.settings.minRechargeAmountPaise,
        minSessionMinutes: data.settings.minSessionMinutes,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Payments</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-xl">
        Every consultation is billed against the user&apos;s wallet in whole-minute blocks - starting a
        consultation charges the minimum session amount up front, and longer sessions are charged
        incrementally as they run. Top-ups are simulated (QR-based) and only credit the wallet once
        approved here.
      </p>

      <section className="card p-6 max-w-xl mb-8">
        <h2 className="font-medium mb-4">Billing rules</h2>
        {!settings ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Minimum recharge amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={settings.minRechargeAmountPaise / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, minRechargeAmountPaise: Math.round(Number(e.target.value) * 100) })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Minimum session length (minutes)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={120}
                  value={settings.minSessionMinutes}
                  onChange={(e) => setSettings({ ...settings, minSessionMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Every new consultation is charged at least (astrologer&apos;s price/min × minimum session
              length) the moment it starts. Users can&apos;t begin a consultation without enough wallet
              balance to cover it.
            </p>
            {saved && <p className="text-green-600 text-sm">Saved.</p>}
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Billing Rules"}
            </button>
          </form>
        )}
      </section>

      <section className="card p-6 max-w-xl mb-8">
        <h2 className="font-medium mb-1">Recharge bonus schemes</h2>
        <p className="text-xs text-slate-500 mb-4">
          Shown as promo cards on the wallet page to encourage bigger top-ups. When you approve a
          top-up that meets a scheme&apos;s minimum, the bonus is credited automatically on top of the
          amount paid.
        </p>

        <div className="space-y-2 mb-4">
          {schemes.length === 0 && <p className="text-slate-500 text-sm">No schemes yet.</p>}
          {schemes.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-orange-100 py-2">
              <div>
                <p className="text-sm font-medium">
                  {s.label} - +{s.bonusPercent}%
                  {s.isFirstTimeOnly && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-foil font-bold">First recharge only</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">On recharges of ₹{(s.minAmountPaise / 100).toFixed(0)}+</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  className="text-xs px-2 py-1 rounded-full border border-orange-200 text-slate-600 hover:bg-orange-50"
                  onClick={() => toggleScheme(s)}
                  disabled={schemeBusy}
                >
                  {s.active ? "Active" : "Inactive"}
                </button>
                <button
                  className="text-xs px-2 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => deleteScheme(s.id)}
                  disabled={schemeBusy}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={createScheme} className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Label</label>
            <input
              className="input"
              placeholder="e.g. Power Pack"
              value={newScheme.label}
              onChange={(e) => setNewScheme({ ...newScheme, label: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Min recharge (₹)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={newScheme.minAmountPaise / 100}
              onChange={(e) => setNewScheme({ ...newScheme, minAmountPaise: Math.round(Number(e.target.value) * 100) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Bonus %</label>
            <input
              className="input"
              type="number"
              min={1}
              max={200}
              value={newScheme.bonusPercent}
              onChange={(e) => setNewScheme({ ...newScheme, bonusPercent: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-3">
            <input
              type="checkbox"
              checked={newScheme.isFirstTimeOnly}
              onChange={(e) => setNewScheme({ ...newScheme, isFirstTimeOnly: e.target.checked })}
            />
            Only applies to a user&apos;s first-ever approved recharge (e.g. a first-time double bonus)
          </label>
          <button className="btn-primary sm:col-span-3" disabled={schemeBusy}>
            Add Scheme
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-medium mb-4">Pending top-up requests</h2>
        {pending.length === 0 && <p className="text-slate-500 text-sm">No pending requests.</p>}

        <div className="space-y-3">
          {pending.map((tx) => (
            <div key={tx.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium">{rupees(tx.amount)} <span className="text-xs text-slate-500">· {tx.referenceCode}</span></p>
                <p className="text-xs text-slate-500">{tx.user.name} ({tx.user.email}) · {new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary !px-3 !py-1.5" onClick={() => act(tx.id, "approve")} disabled={busyId === tx.id}>
                  Approve
                </button>
                <button className="btn-secondary !px-3 !py-1.5" onClick={() => act(tx.id, "reject")} disabled={busyId === tx.id}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
