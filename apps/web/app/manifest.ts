import type { MetadataRoute } from "next";

/**
 * Enables "Add to Home Screen" / installable-PWA prompts. Dark canvas/icon
 * colors match the treemap and OG-image brand identity (see LogoMark.tsx)
 * rather than the sepia default site theme, since theme_color/background_color
 * are static and can't follow the visitor's saved light/dark/sepia choice.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PSEye — PSE Market Tracker",
    short_name: "PSEye",
    description: "A free, community-first tracker for the Philippine Stock Exchange.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f14",
    theme_color: "#0d0f14",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
