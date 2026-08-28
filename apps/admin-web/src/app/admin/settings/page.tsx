"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { adminApi } from "@/lib/api";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(70);
  const [minAttempts, setMinAttempts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((s) => {
        setThreshold(s.weakAreaAccuracyThreshold);
        setMinAttempts(s.weakAreaMinAttempts);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await adminApi.updateSettings({ weakAreaAccuracyThreshold: threshold, weakAreaMinAttempts: minAttempts });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="font-display text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          Weak areas are never chosen by hand — they're calculated from candidate
          performance using the rule below.
        </p>

        {loading ? (
          <div className="mt-8 h-40 animate-pulse border border-[var(--border)]" />
        ) : (
          <div className="mt-8 space-y-6 border border-[var(--border)] p-6">
            <div>
              <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
                Accuracy threshold (%)
              </label>
              <p className="mb-2 text-[12px] text-[var(--muted)]">
                A topic is flagged as weak when accuracy falls below this value.
              </p>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="h-10 w-40 border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
              />
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
                Minimum attempts
              </label>
              <p className="mb-2 text-[12px] text-[var(--muted)]">
                A topic needs at least this many attempts before it can be flagged.
              </p>
              <input
                type="number"
                min={1}
                value={minAttempts}
                onChange={(e) => setMinAttempts(Number(e.target.value))}
                className="h-10 w-40 border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
              />
            </div>

            <div className="border border-dashed border-[var(--border)] px-4 py-3 text-[12px] text-[var(--muted)]">
              Current rule: accuracy &lt; {threshold}% AND attempts &ge; {minAttempts}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
              {saved && <span className="text-[12px] text-[var(--muted)]">Saved.</span>}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
