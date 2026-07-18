import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DevToolsLink } from "@/components/DevToolsLink";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PSEye",
    template: "%s | PSEye",
  },
  description: "A free, community-first tracker for the Philippine Stock Exchange.",
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
};

// Site-wide identity markup — no SearchAction claimed here since there's no
// URL-templated search endpoint to point it at (the ticker search widget is
// client-side navigation, not a queryable ?q= route); inaccurate structured
// data is worse than none.
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PSEye",
  url: SITE_URL,
  description: "A free, community-first tracker for the Philippine Stock Exchange.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="sepia"
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
      </body>
    </html>
  );
}
