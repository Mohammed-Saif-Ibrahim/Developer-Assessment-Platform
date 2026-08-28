"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then(() => router.replace("/admin/dashboard"))
      .catch(() => {
        // Not signed in -- stay on the login page.
      });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.login(email, password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center border border-[var(--fg)] font-mono text-[12px] font-bold">
            DA
          </span>
          <span className="font-display text-[16px] font-medium">Admin console</span>
        </div>

        <h1 className="font-display text-2xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          Restricted to platform administrators.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--muted)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full border border-[var(--fg)] bg-[var(--fg)] font-mono text-[13px] uppercase tracking-widest text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}
