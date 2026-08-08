"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface AISettings {
  provider: string;
  apiUrl: string | null;
  model: string;
  hasApiKey: boolean;
  temperature: number;
  maxResponseTokens: number;
  maxMessagesPerSession: number;
  maxSessionMinutes: number;
  maxMessagesPerUserPerDay: number;
  updatedAt: string;
}

export default function AdminAISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const token = getAdminToken();

  useEffect(() => {
    apiGet("/admin/ai-settings", token).then((d) => setSettings(d.settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        provider: settings.provider,
        apiUrl: settings.apiUrl || undefined,
        model: settings.model,
        temperature: settings.temperature,
        maxResponseTokens: settings.maxResponseTokens,
        maxMessagesPerSession: settings.maxMessagesPerSession,
        maxSessionMinutes: settings.maxSessionMinutes,
        maxMessagesPerUserPerDay: settings.maxMessagesPerUserPerDay,
      };
      if (apiKeyInput) payload.apiKey = apiKeyInput;
      const data = await apiPut("/admin/ai-settings", payload, token);
      setSettings(data.settings);
      setApiKeyInput("");
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await apiPost("/admin/ai-settings/test", undefined, token);
      setTestResult(data);
    } finally {
      setTesting(false);
    }
  }

  if (!settings) {
    return (
      <AdminGuard>
        <AdminNav />
        <p className="text-slate-400">Loading...</p>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">AI Settings</h1>
      <p className="text-slate-500 text-sm mb-6 max-w-xl">
        Controls which AI provider powers every astrologer consultation, prediction, remedy, and
        broadcast on the site. Normal users never see any of this - only the consultation
        experience itself.
      </p>

      <form onSubmit={handleSave} className="card p-6 space-y-4 max-w-xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Provider</label>
            <select
              className="input"
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
              <option value="compatible">OpenAI-compatible endpoint</option>
              <option value="local">Local model server</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Model</label>
            <input
              className="input"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            />
          </div>
        </div>

        {(settings.provider === "compatible" || settings.provider === "local" || settings.provider === "openai") && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              API URL {settings.provider === "compatible" ? "(required)" : "(optional override)"}
            </label>
            <input
              className="input"
              placeholder="https://api.example.com/v1"
              value={settings.apiUrl ?? ""}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="text-xs text-slate-500 block mb-1">
            API Key {settings.hasApiKey ? "(currently set - leave blank to keep it)" : "(not set - falls back to env vars)"}
          </label>
          <input
            className="input"
            type="password"
            placeholder={settings.hasApiKey ? "••••••••••••" : "sk-..."}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Temperature</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Max response tokens</label>
            <input
              className="input"
              type="number"
              min={50}
              max={4000}
              value={settings.maxResponseTokens}
              onChange={(e) => setSettings({ ...settings, maxResponseTokens: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Max messages / session</label>
            <input
              className="input"
              type="number"
              min={1}
              value={settings.maxMessagesPerSession}
              onChange={(e) => setSettings({ ...settings, maxMessagesPerSession: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Max session minutes</label>
            <input
              className="input"
              type="number"
              min={1}
              value={settings.maxSessionMinutes}
              onChange={(e) => setSettings({ ...settings, maxSessionMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Daily limit / user</label>
            <input
              className="input"
              type="number"
              min={1}
              value={settings.maxMessagesPerUserPerDay}
              onChange={(e) => setSettings({ ...settings, maxMessagesPerUserPerDay: Number(e.target.value) })}
            />
          </div>
        </div>

        {saved && <p className="text-green-600 text-sm">Saved.</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Configuration"}</button>
          <button type="button" className="btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>
        {testResult && (
          <p className={"text-sm " + (testResult.ok ? "text-green-600" : "text-red-600")}>{testResult.message}</p>
        )}
      </form>
    </AdminGuard>
  );
}
