"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { setAdminToken } from "@/lib/session";

export default function AdminGatewayPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const gatewayToken = sessionStorage.getItem("astro_admin_gateway_token");
    if (!gatewayToken) {
      setError("No active gateway session. Go back to the Info page and unlock access again.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost("/auth/admin/login", { gatewayToken, username, password });
      setAdminToken(data.admin);
      sessionStorage.removeItem("astro_admin_gateway_token");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto card p-8 mt-10">
      <h1 className="text-xl font-semibold mb-1">Admin access</h1>
      <p className="text-xs text-slate-500 mb-6">Restricted area. Authorized personnel only.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Verifying..." : "Enter dashboard"}
        </button>
      </form>
    </div>
  );
}
