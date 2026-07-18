import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

/** 512x512 PWA install-icon size (used for the splash screen / maskable icon) — see app/manifest.ts. */
export async function GET() {
  return new ImageResponse(<LogoMark size={512} />, { width: 512, height: 512 });
}
