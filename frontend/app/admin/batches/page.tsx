"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface BatchInfo {
  batch: number;
  total: number;
  active: number;
  online: boolean;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [batchSize, setBatchSize] = useState("200");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = getAdminToken();

  async function refresh() {
    const data = await apiGet("/astrologers/admin/batches", token);
    setBatches(data.batches);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    const size = parseInt(batchSize, 10);
    if (!size || size < 1) return;
    if (!confirm(`Re-organize the entire roster into batches of ${size}? Every Oracle's batch number will be reassigned.`)) return;
    setBusy(true);
    setError("");
    try {
      await apiPost("/astrologers/admin/batches/assign", { batchSize: size }, token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBatch(batch: number, active: boolean) {
    setBusy(true);
    setError("");
    try {
      await apiPost(`/astrologers/admin/batches/${batch}/toggle`, { active }, token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Oracle batches</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">
        Group the roster into fixed-size cohorts and bring a whole batch online or offline at
        once - e.g. keep one 200-strong batch active while a second sits in reserve.
      </p>

      <form onSubmit={handleAssign} className="card p-6 max-w-md mb-8 space-y-3">
        <h2 className="font-medium">Re-organize into batches</h2>
        <p className="text-xs text-slate-500">
          One-time action - assigns every Oracle (by creation order) into sequential batches of
          this size. Existing per-astrologer active/inactive state is untouched until you toggle
          a batch below.
        </p>
        <div className="flex gap-2 items-end">
          <input className="input" type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={busy}>Assign batches</button>
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2 max-w-xl">
        {batches.length === 0 && <p className="text-slate-500 text-sm">No batches yet - assign one above.</p>}
        {batches.map((b) => (
          <div key={b.batch} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Batch {b.batch}</p>
              <p className="text-xs text-slate-500">{b.active} of {b.total} active</p>
            </div>
            <button
              className={"text-xs px-3 py-1.5 rounded-full border shrink-0 " + (b.online ? "bg-green-100 text-green-700 border-green-200" : "border-orange-200 text-slate-600")}
              onClick={() => toggleBatch(b.batch, !b.online)}
              disabled={busy}
            >
              {b.online ? "Online" : "Offline"}
            </button>
          </div>
        ))}
      </div>
    </AdminGuard>
  );
}
