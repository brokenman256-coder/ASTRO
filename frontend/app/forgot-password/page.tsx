"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiPost("/auth/forgot-password", { email });
      setMessage(data.message);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-2xl font-semibold mb-2">Forgot password</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter your account email and we&apos;ll get a one-time code to you so you can reset your password.
      </p>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Submitting..." : "Send OTP request"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-700 bg-orange-50 border border-orange-200 rounded-xl p-4">{message}</p>
          <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="btn-primary w-full text-center block">
            I have my code
          </Link>
        </div>
      )}

      <p className="text-center text-sm mt-6">
        <Link href="/login" className="text-brand-dark hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
