import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "What PSEye is, why it exists, and how it gets its Philippine Stock Exchange data.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="kicker text-accent">About</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">About PSEye</h1>

      <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-foreground/80">
        <p>
          PSEye is a free tracker for the Philippine Stock Exchange: a market map, per-stock
          pages, dividend and disclosure history, foreign fund flow, block sales, and a
          cost-averaging calculator. No login, no paywall.
        </p>
        <p>
          It exists because the tools that already cover the PSE either skip the things that
          make a market easy to read (a shareable heatmap of the whole board, a foreign
          buying/selling tracker, news tagged to a specific ticker) or gate them behind a
          subscription or a brokerage account. PSEye requires neither.
        </p>
        <p>
          The data is real, not a demo. Prices, dividends, disclosures, block sales, and
          foreign flow are scraped on a schedule from the exchange&apos;s own public pages and
          PSE&apos;s published daily reports, not a licensed real-time feed, so figures are
          delayed or end-of-day, never live intraday data. The one exception is the charts page,
          which covers non-PSE tickers because TradingView does not license PSE data for
          third-party embeds. An IPO and follow-on offering tracker was built and then removed
          rather than left running on invented companies, since no free, reliable public source
          for it exists.
        </p>
        <p>
          PSEye is a solo, spare-time project, built and maintained by{" "}
          <a
            href="https://www.linkedin.com/in/ezra-guiao/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Ezra Guiao
          </a>
          . It&apos;s open source under the MIT license. The code, including exactly how each
          data source is scraped and parsed, is on{" "}
          <a
            href="https://github.com/Cytical/PSEye"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            GitHub
          </a>
          .
        </p>
        <p>
          New to investing and not sure what to do with this?{" "}
          <Link href="/getting-started" className="underline hover:no-underline">
            Getting Started
          </Link>{" "}
          walks through opening a brokerage account and placing a first order.
        </p>
        <p>
          Nothing on PSEye is financial advice, a stock pick, or a buy/sell signal. It&apos;s
          informational only. Spotted a data issue or have a question?{" "}
          <Link href="/contact" className="underline hover:no-underline">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
