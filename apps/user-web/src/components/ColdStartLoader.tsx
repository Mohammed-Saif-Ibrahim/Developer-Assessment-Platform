"use client";

import { useEffect, useState } from "react";

// Shown via loading.tsx while a Server Component's fetch to the API
// is still in flight. Next.js streams this in immediately (it wraps
// the route in a Suspense boundary automatically because a
// loading.tsx file exists), then swaps it for the real page once the
// fetch resolves -- so this needs no polling or manual retry logic,
// it just needs to stay honest about *why* it's taking a while.
//
// The Render free tier spins the API down after inactivity and takes
// roughly 30-50s to wake back up, so the copy escalates in stages
// rather than saying "loading..." for a full minute.
const STAGES = [
  { after: 0, text: "Loading…" },
  { after: 4, text: "Waking up the server…" },
  { after: 12, text: "Still waking up — this can take up to a minute after inactivity." },
  { after: 30, text: "Almost there. Free-tier servers are slow to start, thanks for waiting." },
] as const;

export default function ColdStartLoader() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const message = [...STAGES].reverse().find((s) => elapsed >= s.after)!.text;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mono-tag mb-6 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        Connecting
      </span>

      <div
        className="relative h-[3px] w-full max-w-xs overflow-hidden border border-[var(--border)]"
        role="progressbar"
        aria-label="Connecting to the server"
        aria-busy="true"
      >
        <span className="cold-start-bar absolute inset-y-0 left-0 w-1/3 bg-[var(--fg)]" />
      </div>

      <p
        className="mt-6 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
