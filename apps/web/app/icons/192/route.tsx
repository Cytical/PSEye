import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

/** 192x192 PWA install-icon size (Android's "Add to Home Screen" minimum) — see app/manifest.ts. */
export async function GET() {
  return new ImageResponse(<LogoMark size={192} />, { width: 192, height: 192 });
}
