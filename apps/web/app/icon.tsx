import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0b",
          borderRadius: 7,
        }}
      >
        <span style={{ color: "#0ca30c", fontSize: 22, fontWeight: 700, fontFamily: "sans-serif" }}>P</span>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
