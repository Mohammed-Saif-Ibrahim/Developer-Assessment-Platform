"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/subjects", label: "Subjects" },
  { href: "/progress", label: "Progress" },
  { href: "/bookmarks", label: "Bookmarks" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--fg)] font-mono text-[11px] font-bold">
            DA
          </span>
          <span className="font-display text-[15px] font-medium tracking-tight">
            Developer Assessment
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[12px] uppercase tracking-widest text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center border border-[var(--border)] md:hidden"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {open ? (
                <path d="M3 3L13 13M13 3L3 13" strokeLinecap="round" />
              ) : (
                <path d="M2 4H14M2 8H14M2 12H14" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--border)] px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-mono text-[12px] uppercase tracking-widest text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}