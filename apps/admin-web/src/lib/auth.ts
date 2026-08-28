"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "./api";

/**
 * Client-side guard for a nicer UX (immediate redirect if not signed in).
 * This is NOT the real security boundary -- every admin API route
 * independently verifies the session server-side via requireAdmin, using
 * the HttpOnly cookie the browser sends automatically. There is no
 * client-readable token to check up front, so we ask the API.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");
  const [admin, setAdmin] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    adminApi
      .me()
      .then((res) => {
        setAdmin({ email: res.admin.email, role: res.admin.role });
        setStatus("ready");
      })
      .catch(() => {
        router.replace("/admin/login");
      });
  }, [router]);

  return { status, admin };
}

export async function logout(router: ReturnType<typeof useRouter>) {
  try {
    await adminApi.logout();
  } catch {
    // Even if the request fails, still send the user back to login.
  }
  router.replace("/admin/login");
}
