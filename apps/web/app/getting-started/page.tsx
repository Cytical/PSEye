import type { Metadata } from "next";
import Link from "next/link";
import { MarketMapFaq } from "@/components/MarketMapFaq";

export const metadata: Metadata = {
  title: "Getting Started: How to Buy a PSE Stock",
  description:
    "New to investing? A plain-English walkthrough from finding a stock on PSEye to owning shares of it: brokerage accounts, board lots, fees, taxes, and settlement.",
  alternates: { canonical: "/getting-started" },
};

// Deliberately doesn't re-cover ground the numbered walkthrough below already
// answers (opening an account, board lots, placing an order) — these are the
// next layer of questions a beginner has once those mechanics are covered:
// money/risk/legitimacy concerns, not process steps.
const FAQ = [
  {
    q: "How much money do I need to start?",
    a: "There's no exchange-wide minimum. It depends on the stock's board lot size and price (a single lot of a low-priced stock can cost well under ₱1,000), plus your broker's own minimum initial deposit, which commonly runs from a few hundred pesos to around ₱25,000 depending on the broker.",
  },
  {
    q: "Can I lose more money than I invested?",
    a: "Not through a plain cash purchase of shares — the most a stock position can lose is what you paid for it, if the price falls all the way to zero. That's different from margin trading or derivatives, neither of which PSEye covers.",
  },
  {
    q: "Is PSEye affiliated with any broker, or with the PSE itself?",
    a: "No. PSEye is an independent, community-built tracker with no brokerage relationship and no official affiliation with the Philippine Stock Exchange — it reads the same public disclosures and reports anyone can access.",
    href: "/about",
    hrefLabel: "About PSEye →",
  },
  {
    q: "How long does opening a brokerage account take?",
    a: "For most online brokers, a few business days once you've submitted a valid government ID and the other standard KYC requirements — some approve an account within 24-48 hours, though funding it and placing a first order can take a little longer depending on your bank transfer method.",
  },
  {
    q: "What happens to my shares if a company gets suspended from trading?",
    a: "You still own them — a trading suspension halts buying and selling, it doesn't cancel existing ownership. You simply can't trade that stock until PSE lifts the suspension, which can take anywhere from a day to much longer depending on the reason.",
    href: "/glossary/suspended",
    hrefLabel: "See the Suspended glossary entry →",
  },
  {
    q: "Do I need to watch the market every day?",
    a: "No. PSEye's Daily Recap and each stock's own disclosure history exist specifically so you can catch up on what happened without watching a live feed all day — investing in PSE stocks doesn't require the constant monitoring day-trading does.",
    href: "/daily",
    hrefLabel: "See the Daily Recap →",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
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
            quote before an order goes in. A filled trade{" "}
            <Link href="/glossary/settlement-t2" className="underline hover:no-underline">
              settles two business days later (T+2)
            </Link>
            , when the shares land in your account.
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

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            5. What it actually costs
          </h2>
          <p className="mt-2">
            Beyond the price of the shares themselves, three costs apply to a typical trade: your
            broker&apos;s own commission (commonly around 0.25%&ndash;0.5% of trade value, often
            with a small minimum peso fee, plus VAT), a PSE/SCCP clearing fee, and &mdash; on the
            sell side only &mdash; a{" "}
            <Link href="/glossary/stock-transaction-tax" className="underline hover:no-underline">
              0.6% stock transaction tax
            </Link>{" "}
            deducted automatically from the proceeds. Cash dividends have their own separate 10%
            final withholding tax deducted
            before they reach your account, so a stock page&apos;s dividend yield is the gross
            figure, not what actually lands in your bank. None of these are something you
            calculate or file yourself &mdash; your broker handles the deductions, and none of
            this is tax advice for your specific situation.
          </p>
        </section>
      </div>

      <MarketMapFaq items={FAQ} />

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
