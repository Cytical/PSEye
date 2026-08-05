import type { Metadata } from "next";
import Link from "next/link";
import { MarketMapFaq } from "@/components/MarketMapFaq";

export const metadata: Metadata = {
  title: "Getting Started: How to Buy a PSE Stock",
  description:
    "A zero-jargon walkthrough for first-time PSE investors: choosing a brokerage, comparing accounts, placing your first order, fees, taxes, settlement, and where to keep learning.",
  alternates: { canonical: "/getting-started" },
};

// Deliberately doesn't re-cover ground the numbered walkthrough below already
// answers (opening an account, board lots, placing an order) — these are the
// next layer of questions a beginner has once those mechanics are covered:
// money/risk/legitimacy concerns, not process steps.
const FAQ = [
  {
    q: "How much money do I need to start?",
    a: "There's no exchange-wide minimum. It depends on the stock's board lot size and price (a single lot of a low-priced stock can cost well under ₱1,000), plus your broker's own minimum initial deposit, which varies by broker — some are built around small first-time accounts, others expect more. Check the specific broker's current requirement before assuming either way.",
  },
  {
    q: "Can I lose more money than I invested?",
    a: "Not through a plain cash purchase of shares — the most a stock position can lose is what you paid for it, if the price falls all the way to zero. That's different from margin trading or derivatives, neither of which PSEye covers.",
  },
  {
    q: "What's the difference between a market order and a limit order?",
    a: "A market order fills immediately at whatever price is available right now; a limit order only fills at a price you set (or better), but might not fill at all if the market never reaches it. Most brokers default to market orders, but let you switch to a limit order in the same order form.",
    href: "/glossary/limit-order",
    hrefLabel: "See the Limit Order glossary entry →",
  },
  {
    q: "Is PSEye affiliated with any broker, or with the PSE itself?",
    a: "No. PSEye is an independent, community-built tracker with no brokerage relationship and no official affiliation with the Philippine Stock Exchange — it reads the same public disclosures and reports anyone can access. It doesn't recommend one broker over another.",
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

/** Qualitative only, deliberately no exact peso minimums or commission
 * percentages: those numbers change and PSEye has no live feed into any
 * broker's fee schedule, so a hardcoded figure here would eventually go
 * stale and mislead a beginner into a wrong assumption. Account *type* and
 * reputation are stable enough to state plainly; the reader is pointed to
 * confirm current numbers directly with whichever broker they're considering. */
const BROKERS: { name: string; type: string; note: string }[] = [
  {
    name: "COL Financial",
    type: "Standalone (any bank)",
    note: "The Philippines' oldest and largest online-only broker — deep bench of free research reports, screeners, and beginner guides built into the platform.",
  },
  {
    name: "BPI Trade",
    type: "Bank-linked (BPI)",
    note: "Run by BPI. Most convenient if you already hold a BPI account — funding and withdrawing tends to be fastest between accounts at the same bank.",
  },
  {
    name: "First Metro Sec (FirstMetroSec)",
    type: "Bank-linked (Metrobank)",
    note: "Backed by Metrobank's First Metro Investment Corp — same bank-linked convenience as BPI Trade, for Metrobank clients.",
  },
  {
    name: "BDO Nomura",
    type: "Bank-linked (BDO)",
    note: "BDO's online trading arm. Same bank-linked convenience if you already bank with BDO.",
  },
  {
    name: "Philstocks (Wealth Securities)",
    type: "Standalone (any bank)",
    note: "Historically positioned toward smaller, first-time accounts — worth comparing if a lower initial deposit matters most to you.",
  },
  {
    name: "AAA Southeast Equities",
    type: "Standalone (any bank)",
    note: "Another standalone option with its own mobile app, independent of any particular bank relationship.",
  },
];

/** Internal tools worth knowing about once the mechanics (this page) are out
 * of the way — grouped by what a beginner would actually reach for first
 * (research a specific stock, find one worth researching, then plan/track),
 * rather than the nav's own topic-based grouping which assumes more context
 * than a first-time visitor has yet. */
const NEXT_TOOLS: { href: string; label: string; description: string }[] = [
  {
    href: "/glossary",
    label: "Glossary",
    description: "Every term used on PSEye, defined in plain English — the fastest way to look something up.",
  },
  {
    href: "/screener",
    label: "Explorer",
    description: "Filter and sort all 282 tracked companies by sector, size, price, and performance.",
  },
  {
    href: "/dca",
    label: "DCA Calculator",
    description: "See what investing a fixed amount every month would have grown to, historically.",
  },
  {
    href: "/portfolio",
    label: "Portfolio Tracker",
    description: "Log the shares you actually hold and watch live gain/loss without spreadsheets.",
  },
  {
    href: "/daily",
    label: "Daily Recap",
    description: "A plain-English summary of what the market did today, without watching a live feed.",
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Upcoming ex-dividend dates and other corporate actions across every listed company.",
  },
  {
    href: "/rankings",
    label: "Rankings",
    description: "Every stock ranked by market size, so you can see where a company actually stands.",
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Volatility, beta, RSI, and correlation for stocks that already interest you.",
  },
];

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <p className="kicker text-accent">New here?</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
        How do I actually buy a PSE stock?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        This page assumes zero background. No jargon left unexplained, no assumed knowledge of how
        brokers or the exchange work. PSEye can show you every listed company, what it&apos;s worth,
        and how it&apos;s been trading — but it&apos;s a tracker, not a brokerage, so it can&apos;t
        place an order for you. This covers the step PSEye skips: everything between finding a stock
        here and actually owning shares of it.
      </p>
      <p className="mt-3 rounded-lg bg-panel-raised px-3.5 py-2.5 text-xs leading-relaxed text-foreground/70 ring-1 ring-panel-border">
        Worth saying up front: investing in stocks carries real risk of loss. Only invest money
        you can afford to have tied up or lose, take time to understand what you&apos;re buying, and
        treat everything below as general information, not personalized financial advice.
      </p>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            1. Open a brokerage account
          </h2>
          <p className="mt-2">
            Every order on the PSE goes through a PSE-accredited stockbroker (the exchange calls
            them &ldquo;Trading Participants&rdquo;). There&apos;s no way to buy shares directly
            from the exchange or from PSEye. Several accept online applications with no branch
            visit required — you&apos;ll typically need a valid government ID, a TIN, and proof of
            address, plus whatever initial deposit that broker sets. Requirements, fees, and
            minimum deposits vary by broker and change over time, so confirm current numbers
            directly with whichever one you&apos;re considering before applying.
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg ring-1 ring-panel-border">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="bg-panel-raised text-left text-[10.5px] uppercase tracking-[0.04em] text-foreground/55">
                  <th className="px-3 py-2 font-medium">Broker</th>
                  <th className="px-3 py-2 font-medium">Account type</th>
                  <th className="px-3 py-2 font-medium">Good to know</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {BROKERS.map((b) => (
                  <tr key={b.name}>
                    <td className="px-3 py-2.5 align-top font-medium text-foreground">{b.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-foreground/70">{b.type}</td>
                    <td className="px-3 py-2.5 align-top text-foreground/70">{b.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            Not an exhaustive list, and not a recommendation of any one broker over another — just
            the more commonly used online options, to give you a starting point.{" "}
            <a
              href="https://www.pse.com.ph/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              PSE&apos;s own website
            </a>{" "}
            publishes the full, current list of accredited trading participants. A bank-linked
            broker is usually the path of least friction if you already bank with that institution
            (funds move between accounts fastest); a standalone broker works the same regardless of
            which bank you use.
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
            covers everything else you&apos;ll run into on PSEye, in plain English — and on the
            stock pages themselves, any term with a small{" "}
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-foreground/60 ring-1 ring-foreground/30">
              i
            </span>{" "}
            next to it opens a quick definition on hover, with a link into the full entry.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            3. Fund your account and place an order
          </h2>
          <p className="mt-2">
            Once your account is funded, you place a buy order through your broker&apos;s own
            platform: a ticker, a quantity in whole board lots, and a price. Most order forms
            default to a{" "}
            <Link href="/glossary/market-order" className="underline hover:no-underline">
              market order
            </Link>{" "}
            (fills right away at the best available price) but let you switch to a{" "}
            <Link href="/glossary/limit-order" className="underline hover:no-underline">
              limit order
            </Link>{" "}
            (fills only at a price you set, or better) — a limit order is generally the safer
            default for a first-time buyer, since it caps what you actually pay. PSEye&apos;s
            prices are delayed/end-of-day, not a live tick-by-tick feed, so check your
            broker&apos;s own quote before an order goes in. A filled trade{" "}
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
            broker&apos;s own commission (a small percentage of trade value, often with a minimum
            peso fee, plus VAT — the exact rate varies by broker), a PSE/SCCP clearing fee, and
            &mdash; on the sell side only &mdash; a{" "}
            <Link href="/glossary/stock-transaction-tax" className="underline hover:no-underline">
              0.6% stock transaction tax
            </Link>{" "}
            deducted automatically from the proceeds. Cash dividends have their own separate 10%
            final withholding tax deducted before they reach your account, so a stock page&apos;s
            dividend yield is the gross figure, not what actually lands in your bank. None of
            these are something you calculate or file yourself &mdash; your broker handles the
            deductions, and none of this is tax advice for your specific situation.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            6. Common first-timer mistakes
          </h2>
          <p className="mt-2">A few patterns that trip up new investors more than the mechanics above ever do:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <span className="text-foreground">Buying on a tip without reading anything.</span>{" "}
              A company&apos;s own{" "}
              <Link href="/disclosures" className="underline hover:no-underline">
                disclosures
              </Link>{" "}
              take a few minutes to skim and are the actual primary source, not a forum post or a
              screenshot.
            </li>
            <li>
              <span className="text-foreground">Putting everything into one stock.</span>{" "}
              Spreading money across companies and sectors means one bad outcome doesn&apos;t sink
              the whole account — see how holdings are grouped on the{" "}
              <Link href="/sectors" className="underline hover:no-underline">
                sector
              </Link>{" "}
              pages.
            </li>
            <li>
              <span className="text-foreground">Reacting to every daily swing.</span>{" "}
              A stock moving a few percent in a day is routine, not necessarily news — the{" "}
              <Link href="/daily" className="underline hover:no-underline">
                Daily Recap
              </Link>{" "}
              exists so you can check in on your own schedule instead of watching a live feed.
            </li>
            <li>
              <span className="text-foreground">Trading small amounts too often.</span>{" "}
              Commission and the stock transaction tax are charged per trade regardless of size, so
              frequent small trades quietly eat more of the return than the same money moved less
              often.
            </li>
            <li>
              <span className="text-foreground">Reaching for margin or leverage before understanding it.</span>{" "}
              Borrowing to invest amplifies losses the same way it amplifies gains — worth
              understanding thoroughly, and asking your broker to explain in full, before ever
              using it. PSEye doesn&apos;t cover margin trading.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
            7. Where to go next
          </h2>
          <p className="mt-2">Once the account and first order are sorted, these are the tools worth knowing about:</p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {NEXT_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border transition-colors hover:bg-panel-active"
              >
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <p className="mt-0.5 text-xs leading-snug text-foreground/65">{t.description}</p>
              </Link>
            ))}
          </div>
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
