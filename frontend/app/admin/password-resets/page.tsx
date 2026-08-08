"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface ResetRequest {
  id: string;
  email: string;
  otp: string;
  used: boolean;
  expiresAt: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function PasswordResetsPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getAdminToken();

  useEffect(() => {
    apiGet("/auth/admin/password-resets", token)
      .then((d) => setRequests(d.requests))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Password reset requests</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-xl">
        No email/SMS provider is configured, so this is a demo delivery channel - the same way wallet
        top-ups are simulated. When a user requests a reset, their one-time code shows up here for you
        to relay to them (phone, WhatsApp, etc). Codes expire 10 minutes after being requested.
      </p>

      {loading && <p className="text-slate-400 text-sm">Loading...</p>}
      {!loading && requests.length === 0 && <p className="text-slate-500 text-sm">No requests yet.</p>}

      <div className="space-y-3">
        {requests.map((r) => {
          const expired = new Date(r.expiresAt).getTime() < Date.now();
          const status = r.used ? "Used" : expired ? "Expired" : "Active";
          return (
            <div key={r.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium">
                  {r.user.name} <span className="text-xs text-slate-500">({r.email})</span>
                </p>
                <p className="text-xs text-slate-500">
                  Requested {new Date(r.createdAt).toLocaleString()} · expires{" "}
                  {new Date(r.expiresAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg tracking-widest bg-orange-50 border border-orange-200 rounded-lg px-3 py-1">
                  {r.otp}
                </span>
                <span
                  className={
                    "text-xs px-2 py-1 rounded-full " +
                    (status === "Active"
                      ? "bg-green-100 text-green-700"
                      : status === "Used"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-red-100 text-red-600")
                  }
                >
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AdminGuard>
  );
}
