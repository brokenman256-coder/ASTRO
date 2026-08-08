"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface PendingTx {
  id: string;
  amount: number;
  referenceCode: string;
  createdAt: string;
  user: { name: string; email: string };
}

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function WalletApprovalsPage() {
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const token = getAdminToken();

  async function refresh() {
    const data = await apiGet("/wallet/admin/pending", token);
    setPending(data.pending);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await apiPost(`/wallet/admin/${id}/${action}`, undefined, token);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Wallet top-up approvals</h1>
      <p className="text-slate-500 text-sm mb-6">
        Every top-up request is simulated (QR-based) and only credits the user&apos;s wallet once you approve it here.
      </p>

      {pending.length === 0 && <p className="text-slate-500 text-sm">No pending requests.</p>}

      <div className="space-y-3">
        {pending.map((tx) => (
          <div key={tx.id} className="card p-4 flex items-center justify-between">
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
    </AdminGuard>
  );
}
