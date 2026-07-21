import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DevToolsLink } from "@/components/DevToolsLink";
import { InstallPrompt } from "@/components/InstallPrompt";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.vercel.app" : "http://localhost:3000");

// Google Search Console verification token (HTML-tag method). Hardcoded to the
// verified property's token so the meta tag renders in production without a
// Vercel env var; still overridable via NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION if
// the property is ever re-verified under a new token.
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "Q-zI7r8RYWmKcsp-_QFiMqAqIuAyHuo8g33lNzPx40c";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PSEye — Philippine Stock Exchange (PSE) Tracker",
    template: "%s | PSEye",
  },
  description:
    "Free Philippine Stock Exchange tracker: live PSEi heatmap, PSE stock prices, dividend yields, foreign flow, and daily market recaps — no login, no paywall.",
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    siteName: "PSEye",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

// Site-wide identity markup — no SearchAction claimed here since there's no
// URL-templated search endpoint to point it at (the ticker search widget is
// client-side navigation, not a queryable ?q= route); inaccurate structured
// data is worse than none. Organization.logo (a PNG, not the SVG — Google's
// own logo guidelines prefer a raster format) is what lets a knowledge-panel
// or search result show the PSEye mark rather than a generic globe icon.
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "PSEye",
      url: SITE_URL,
      description: "A free, community-first tracker for the Philippine Stock Exchange.",
    },
    {
      "@type": "Organization",
      name: "PSEye",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/512`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved/system theme before first paint so there's no
            flash of the wrong background. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <DevToolsLink />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
