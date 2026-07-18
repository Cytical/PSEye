import { LogoMark } from "./LogoMark";

/** Icon + wordmark lockup for the header. The mark always renders with its own
 * dark chip regardless of the active site theme (light/dark/sepia) — a
 * consistent badge, same reasoning as LogoMark's own doc comment. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-semibold tracking-tight">PSEye</span>
    </span>
  );
}
