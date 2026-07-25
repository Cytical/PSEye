import { LogoMark } from "./LogoMark";

/** Icon + wordmark lockup for the header. The mark always renders with its own
 * dark chip regardless of the active site theme (light/dark) — a
 * consistent badge, same reasoning as LogoMark's own doc comment. The
 * wordmark is set in the editorial display serif (see globals.css's
 * --font-serif) so the one piece of chrome on every page carries the site's
 * "research desk" register even where the rest of a page is plain sans. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-serif text-[1.2rem] font-semibold tracking-tight">PSEye</span>
    </span>
  );
}
