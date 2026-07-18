import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<LogoMark size={180} />, { width: size.width, height: size.height });
}
