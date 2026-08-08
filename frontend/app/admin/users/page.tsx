"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface UserRow {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/admin/users", getAdminToken())
      .then((d) => setUsers(d.users))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Users</h1>
      <p className="text-slate-500 text-sm mb-6">
        Every user's full activity - predictions, palm reading photos, remedies, and wallet
        transactions - is available from here.
      </p>

      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && users.length === 0 && <p className="text-slate-500 text-sm">No users yet.</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="card p-4 flex items-center justify-between hover:border-brand-light/50 transition-colors"
          >
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">₹{(u.walletBalance / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-500">joined {new Date(u.createdAt).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
      </div>
    </AdminGuard>
  );
}
