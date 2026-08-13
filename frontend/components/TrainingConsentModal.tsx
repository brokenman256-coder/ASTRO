"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

interface ImportResult {
  mediaCount?: number;
  storyCount?: number;
  messageCount?: number;
  notes?: string | null;
  importError?: string | null;
}

export default function TrainingConsentModal({
  open,
  onClose,
  onDecided,
}: {
  open: boolean;
  onClose: () => void;
  onDecided?: (accepted: boolean, result?: ImportResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function decide(accepted: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await apiPost("/auth/instagram/consent", { accepted });
      onDecided?.(accepted, {
        mediaCount: data.import?.mediaCount,
        storyCount: data.import?.storyCount,
        messageCount: data.import?.messageCount,
        notes: data.import?.notes,
        importError: data.importError,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your choice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="card max-w-lg w-full p-6 text-slate-800">
        <p className="text-xs uppercase tracking-wide text-maroon font-semibold">Optional · you can say no</p>
        <h2 className="text-xl font-display font-bold mt-1 mb-3">Use your Instagram data to train your Oracle?</h2>
        <p className="text-sm text-slate-600 mb-3">
          If you accept, we only collect data Instagram officially allows, plus any official
          Instagram export you upload later. If you decline, you stay logged in and nothing is imported.
        </p>
        <ul className="text-sm text-slate-700 space-y-2 mb-4 list-disc pl-5">
          <li>Profile, posts, and stories Instagram gives this app</li>
          <li>Professional inbox chats (official Messaging API) — not personal DMs</li>
          <li>Full personal chats only if you later upload Instagram&apos;s own data export</li>
        </ul>
        <p className="text-xs text-slate-500 mb-4">
          We cannot scrape private Instagram DMs. Instagram does not offer that API.
          You can revoke this anytime on your profile — that deletes the imported corpus.
        </p>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? "Saving…" : "Accept and import"}
          </button>
          <button className="btn-secondary flex-1" disabled={busy} onClick={() => decide(false)}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
