import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<LogoMark size={32} />, { width: size.width, height: size.height });
}
