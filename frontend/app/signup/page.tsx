"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { setUserSession } from "@/lib/session";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiPost("/auth/signup", {
        name,
        email,
        password,
        phone: phone || undefined,
        dob: dob || undefined,
      });
      setUserSession(data.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-2xl font-semibold mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Full name</label>
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Email</label>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Phone number</label>
          <input
            className="input"
            type="tel"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Date of birth</label>
          <input
            className="input"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            required
          />
          <p className="text-[11px] text-slate-400 mt-1">Used for more accurate astrology readings.</p>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
