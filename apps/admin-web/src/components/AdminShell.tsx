"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAdmin, logout } from "@/lib/auth";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, admin } = useRequireAdmin();
  const pathname = usePathname();
  const router = useRouter();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="mono-tag text-[12px] text-[var(--muted)]">Authenticating...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)]">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-6">
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--fg)] font-mono text-[11px] font-bold">
            DA
          </span>
          <span className="font-display text-[14px] font-medium">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex h-9 items-center px-3 font-mono text-[12px] uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--fg)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] px-4 py-4">
          <p className="truncate text-[12px] text-[var(--muted)]">{admin?.email}</p>
          <button
            onClick={() => logout(router)}
            className="mt-2 font-mono text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
