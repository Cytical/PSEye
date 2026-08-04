"use client";

import { useActionState } from "react";
import { authenticateTestDashboard, type AuthState } from "@/app/test/actions";

const initialState: AuthState = { error: null };

/** Client-side gate rendered by /test in production until the cookie is set. */
export function TestPasswordPrompt() {
  const [state, formAction, pending] = useActionState(authenticateTestDashboard, initialState);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-24">
      <h1 className="text-lg font-semibold">Data Validation</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        This dashboard is gated in production. Enter the password to continue.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Password"
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
        {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
