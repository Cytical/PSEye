"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { TEST_DASHBOARD_COOKIE, TEST_DASHBOARD_PASSWORD } from "./auth";

export interface AuthState {
  error: string | null;
}

/**
 * Replaces the old `?secret=` query-param gate (matched against
 * DEV_DASHBOARD_SECRET) with an actual password prompt, per 2026-08-04
 * request — this dashboard is now reachable in production behind a fixed
 * password rather than 404ing unless an env var happened to be configured.
 * Not real security (a hardcoded password anyone can read from the client
 * bundle's network tab isn't meant to be), just a speed bump against the
 * page's own re-scrape/GitHub-API-budget cost being hit by a stray crawler
 * or link click — see page.tsx's doc comment for what's actually at risk.
 */
export async function authenticateTestDashboard(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password");
  if (password !== TEST_DASHBOARD_PASSWORD) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(TEST_DASHBOARD_COOKIE, TEST_DASHBOARD_PASSWORD, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/test",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/test");
  return { error: null };
}
