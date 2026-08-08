"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { apiGet, apiPut } from "@/lib/api";
import { getAdminToken } from "@/lib/session";

interface Branding {
  appName: string;
  tagline: string;
  aboutText: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export default function BrandingAdminPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const token = getAdminToken();

  useEffect(() => {
    apiGet("/branding").then((d) => setBranding(d.branding));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!branding) return;
    setSaving(true);
    setSaved(false);
    try {
      const data = await apiPut("/branding/admin", branding, token);
      setBranding(data.branding);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!branding) return (
    <AdminGuard>
      <AdminNav />
      <p className="text-slate-500">Loading...</p>
    </AdminGuard>
  );

  return (
    <AdminGuard>
      <AdminNav />
      <h1 className="text-2xl font-semibold mb-2">Branding</h1>
      <p className="text-slate-500 text-sm mb-6">
        Everything here shapes how Astro presents itself across the app - name, tagline, colors, and story.
      </p>

      <form onSubmit={handleSave} className="card p-6 space-y-4 max-w-xl">
        <div>
          <label className="text-xs text-slate-500 block mb-1">App name</label>
          <input className="input" value={branding.appName} onChange={(e) => setBranding({ ...branding, appName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Tagline</label>
          <input className="input" value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">About text</label>
          <textarea className="input" rows={4} value={branding.aboutText} onChange={(e) => setBranding({ ...branding, aboutText: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Primary color</label>
            <input className="input" type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Secondary color</label>
            <input className="input" type="color" value={branding.secondaryColor} onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Logo URL</label>
          <input className="input" value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." />
        </div>
        {saved && <p className="text-green-600 text-sm">Saved.</p>}
        <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save branding"}</button>
      </form>
    </AdminGuard>
  );
}
