/**
 * Shared between page.tsx (reads the cookie to decide what to render) and
 * actions.ts (sets it after a correct password). Kept in its own file since
 * page.tsx is a Server Component and actions.ts is "use server" — both need
 * the same cookie name/value without importing across that boundary awkwardly.
 */
export const TEST_DASHBOARD_COOKIE = "test_dashboard_auth";
export const TEST_DASHBOARD_PASSWORD = "1024";
