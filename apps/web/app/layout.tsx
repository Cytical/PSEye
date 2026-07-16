import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { SiteFooter } from "@/components/SiteFooter";
import { DevToolsLink } from "@/components/DevToolsLink";
import { ThemeToggle } from "@/components/ThemeToggle";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "PSEye",
    template: "%s | PSEye",
  },
  description: "A free, community-first tracker for the Philippine Stock Exchange.",
  openGraph: {
    siteName: "PSEye",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
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
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          {/* max-w matches page.tsx's widest content container (the market map) so the
              header never reads as narrower than the page below it. */}
          <nav className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 text-sm">
            <Link href="/" className="mr-1 font-semibold opacity-100">
              PSEye
            </Link>
            <NavLinks />
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <DevToolsLink />
      </body>
    </html>
  );
}
