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
      <h1 className="text-xl font-semibold">About PSEye</h1>

      <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-foreground/80">
        <p>
          PSEye is a free tracker for the Philippine Stock Exchange — a market map, per-stock
          pages, dividend and disclosure history, foreign fund flow, block sales, and a
          cost-averaging calculator, all in one place with no login and no paywall.
        </p>
        <p>
          It exists because the tools that already cover the PSE either don&apos;t cover the
          things that make a market easy to actually read — a shareable heatmap of the whole
          board, a foreign buying/selling tracker, news tagged to a specific ticker — or gate
          those behind a subscription or a brokerage account. PSEye doesn&apos;t require either.
        </p>
        <p>
          The data is real, not a demo: prices, dividends, disclosures, block sales, and
          foreign flow are scraped on a schedule from PSE Edge&apos;s own public pages and PSE&apos;s
          published daily reports, not a licensed real-time feed — so figures are delayed/
          end-of-day, never claimed as live intraday data. A small number of features (the IPO/
          offerings tracker, and non-PSE charts) still run on placeholder data where no free,
          reliable public source exists yet.
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
          . It&apos;s open source under the MIT license — the code, including exactly how each
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
          Nothing on PSEye is financial advice, a stock pick, or a buy/sell signal — it&apos;s
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
