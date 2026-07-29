import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started: How to Buy a PSE Stock",
  description:
    "New to investing? A plain-English walkthrough from finding a stock on PSEye to owning shares of it: brokerage accounts, board lots, and settlement.",
  alternates: { canonical: "/getting-started" },
};

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="kicker text-accent">New here?</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
        How do I actually buy a PSE stock?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        PSEye can show you every listed company, what it&apos;s worth, and how it&apos;s been
        trading. But it&apos;s a tracker, not a brokerage, so it can&apos;t place an order for
        you. This page covers the step PSEye skips: what happens between finding a stock
        here and actually owning shares of it.
      </p>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            1. Open a brokerage account
          </h2>
          <p className="mt-2">
            Every order on the PSE goes through a PSE-accredited stockbroker (the exchange calls
            them &ldquo;Trading Participants&rdquo;). There&apos;s no way to buy shares directly
            from the exchange or from PSEye. Several, including COL Financial, BPI Trade, and
            First Metro Securities, accept online applications with no branch visit required; the
            PSE&apos;s own site lists every accredited broker. Requirements, fees, and minimum
            deposits vary by broker, so compare a few before picking one.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            2. Learn the handful of terms that actually matter
          </h2>
          <p className="mt-2">
            You don&apos;t need to understand Sharpe ratios or RSI to place a first order, just a
            few mechanical terms. Shares trade in fixed{" "}
            <Link href="/glossary/board-lot" className="underline hover:no-underline">
              board lots
            </Link>{" "}
            (you can&apos;t buy half a lot), the market only takes orders during{" "}
            <Link href="/glossary/trading-hours" className="underline hover:no-underline">
              PSE trading hours
            </Link>
            , and a stock can be temporarily{" "}
            <Link href="/glossary/suspended" className="underline hover:no-underline">
              suspended
            </Link>{" "}
            from trading. The full{" "}
            <Link href="/glossary" className="underline hover:no-underline">
              PSE investing glossary
            </Link>{" "}
            covers everything else you&apos;ll run into on PSEye, in plain English.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            3. Fund your account and place an order
          </h2>
          <p className="mt-2">
            Once your account is funded, you place a buy order through your broker&apos;s own
            platform: a ticker, a quantity in whole board lots, and a price. PSEye&apos;s prices
            are delayed/end-of-day, not a live tick-by-tick feed, so check your broker&apos;s own
            quote before an order goes in. A filled trade settles a couple of business days
            later (&ldquo;T+2&rdquo;), when the shares land in your account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            4. Come back to PSEye to do the research
          </h2>
          <p className="mt-2">
            This is what PSEye is built for: browse every listed company on the{" "}
            <Link href="/stocks" className="underline hover:no-underline">
              full stock list
            </Link>{" "}
            or the{" "}
            <Link href="/screener" className="underline hover:no-underline">
              Explorer
            </Link>
            , read a company&apos;s own disclosures and dividend history on its stock page, and
            try the{" "}
            <Link href="/dca" className="underline hover:no-underline">
              DCA calculator
            </Link>{" "}
            to see what a fixed monthly amount would have grown to. None of it replaces your
            own judgment or a licensed advisor&apos;s.
          </p>
        </section>
      </div>

      <p className="mt-8 border-t border-foreground/10 pt-5 text-xs text-foreground/65">
        Nothing on this page or anywhere else on PSEye is financial advice, a stock pick, or a
        buy/sell signal. See{" "}
        <Link href="/about" className="underline hover:no-underline">
          About PSEye
        </Link>
        .
      </p>
    </div>
  );
}
