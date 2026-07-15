import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
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
  title: "PSEye",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 text-sm">
            <Link href="/" className="mr-1 font-semibold opacity-100">
              PSEye
            </Link>
            <NavLinks />
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
