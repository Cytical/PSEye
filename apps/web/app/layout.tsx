import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MarketTicker } from "@/components/MarketTicker";
import { DevToolsLink } from "@/components/DevToolsLink";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// 1h; MarketTicker reads live quotes on every route via this layout, so this
// sets the floor for the whole site — matches quotes' hourly ETL cadence
// (market-data-hourly.yml), same reasoning as every page's own `revalidate = 3600`.
export const revalidate = 3600;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for headlines and hero figures (the "high-end
// finance desk" register) — a high-contrast, elegant face rather than a
// plain workhorse serif. Kept off body copy/data (Geist stays there for
// legibility and tabular-nums alignment); see globals.css's --font-serif.
// Only 600 is declared because only 600 is ever used: every one of the 39
// `font-serif` usages in the app pairs it with `font-semibold`, and the
// `.kicker` rule in globals.css sets font-weight: 600 too. Declaring
// 400/500/600/700 made next/font emit 24 @font-face rules and — measured on a
// production build — preload the *700* normal and italic files (36 KB + 45 KB)
// on every route, a weight nothing on the site actually renders in. Italic is
// kept: it's load-bearing for the homepage h1's "Visualized."
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["600"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.site" : "http://localhost:3000");

// Google Search Console verification token (HTML-tag method). Hardcoded to the
// verified property's token so the meta tag renders in production without a
// Vercel env var; still overridable via NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION if
// the property is ever re-verified under a new token.
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "Q-zI7r8RYWmKcsp-_QFiMqAqIuAyHuo8g33lNzPx40c";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PSEye: Philippine Stock Exchange (PSE) Tracker",
    template: "%s | PSEye",
  },
  description:
    "Free Philippine Stock Exchange tracker: live PSEi heatmap, PSE stock prices, dividend yields, foreign flow, and daily market recaps. No login, no paywall.",
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
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved/system theme before first paint so there's no
            flash of the wrong background. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* WCAG 2.4.1 (Bypass Blocks). The ticker tape alone puts ~200+ links
            ahead of the page content on every route, so without this a keyboard
            or switch user tabs ~216 times before reaching <main>. Visually
            hidden until focused, then pinned over the sticky header. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-panel-fg focus:ring-1 focus:ring-panel-border focus:shadow-lg"
        >
          Skip to main content
        </a>
        <MarketTicker />
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <DevToolsLink />
        {/* InstallPrompt disabled for now (2026-07-28) — component is still intact, just unmounted. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
