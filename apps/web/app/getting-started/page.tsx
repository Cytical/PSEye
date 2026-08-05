import type { Metadata } from "next";
import Link from "next/link";
import { MarketMapFaq } from "@/components/MarketMapFaq";

export const metadata: Metadata = {
  title: "How to Invest in PSE Stocks for Beginners",
  description:
    "A plain-English guide to the Philippine Stock Exchange for total beginners: what a stock actually is, how your money grows, comparing brokers like COL Financial, BPI Trade, and DragonFi, and placing your first order.",
  alternates: { canonical: "/getting-started" },
};

/** Jump links into the numbered sections below, rendered as a sticky sidebar
 * on desktop only — see the layout comment above the page component for why
 * the sidebar exists at all. Ids must match each <section id>. */
const TOC: { id: string; label: string }[] = [
  { id: "what-is-a-stock", label: "What is a stock?" },
  { id: "how-money-grows", label: "How your money grows" },
  { id: "open-account", label: "Open a brokerage account" },
  { id: "key-terms", label: "Key terms" },
  { id: "place-order", label: "Place your first order" },
  { id: "research-tools", label: "Research on PSEye" },
  { id: "costs", label: "What it costs" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "next-steps", label: "Where to go next" },
  { id: "faq", label: "FAQ" },
];

// Deliberately doesn't re-cover ground the numbered walkthrough already
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
    q: "Is the Philippine Stock Exchange legitimate and regulated?",
    a: "Yes. The PSE is the country's sole stock exchange, regulated by the Securities and Exchange Commission, with trades cleared and settled through regulated infrastructure, not something informal. That doesn't make any individual stock a safe bet — a company can still lose value or fail — but the exchange and settlement system itself is standard, regulated market plumbing.",
  },
  {
    q: "How do I actually make money from a stock?",
    a: "Two ways: selling shares for more than you paid for them, and cash dividends some companies pay out of profit. Neither is guaranteed — a stock can also fall in price or never pay a dividend.",
    href: "#how-money-grows",
    hrefLabel: "See worked examples →",
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
    name: "DragonFi",
    type: "Mobile app (any bank)",
    note: "A mobile-first trading app aimed squarely at first-time and younger investors, with an account-opening flow built for a phone screen and historically low or zero-commission promotions. Worth checking it supports the order types you want before committing.",
  },
  {
    name: "Maybank Securities",
    type: "Standalone (any bank)",
    note: "One of the longest-running brokers in the market (formerly ATR Kim Eng) — offers both self-service online trading and broker-assisted service for a more hands-on relationship.",
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

/** Three concrete, hypothetical ways a stock position's value can change —
 * the direct answer to "how does my money actually grow," which nothing
 * elsewhere on this page previously spelled out in plain numbers. Every
 * figure is a round, made-up example, not a real ticker's history (that
 * belongs on the stock's own page or the DCA calculator, run on real data),
 * so this can't be mistaken for a forecast or backtest. */
const MONEY_EXAMPLES: { title: string; body: string }[] = [
  {
    title: "Selling for more than you paid",
    body: "Buy 1 board lot (100 shares) of a ₱120 stock for ₱12,000. A year later it's ₱132 — up 10%. Sell, and your shares are worth ₱13,200: a ₱1,200 gain, before fees and tax. The same stock could just as easily have fallen to ₱108 instead — a ₱1,200 loss. That two-sided swing is the core trade-off of owning a stock.",
  },
  {
    title: "Getting paid just to hold it",
    body: "Some companies pay a cash dividend — a slice of profit paid straight to shareholders. Say a company pays ₱3 per share once a year and you own 100 shares: you'd receive ₱300 in cash, on top of whatever the shares themselves are worth. Not every company pays one, and the amount isn't guaranteed year to year.",
  },
  {
    title: "Growing it steadily over time",
    body: "Instead of one lump sum, invest a fixed amount on a regular schedule — say ₱2,000 every month — buying more shares when prices are low and fewer when they're high. This is dollar-cost averaging. PSEye's DCA calculator shows what a specific monthly amount would have grown to, historically, for any tracked stock.",
  },
];

/** Internal tools worth knowing about once the mechanics (this page) are out
 * of the way — grouped by what a beginner would actually reach for first
 * (research a specific stock, find one worth researching, then plan/track),
 * rather than the nav's own topic-based grouping which assumes more context
 * than a first-time visitor has yet. The sidebar reuses the first four as a
 * standing shortcut list; the full set with descriptions still gets its own
 * section further down for anyone reading top to bottom. */
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

const SECTION_HEADING = "font-serif text-xl font-semibold tracking-tight text-foreground";

/**
 * Wide desktop layout, deliberately not a single centered text column: below
 * `lg` this reads top-to-bottom like any article, but from `lg` up the outer
 * wrapper grows to `max-w-6xl` and splits into a reading column (no width
 * cap of its own beyond the grid track, so it actually uses the freed-up
 * desktop space instead of leaving it blank on either side of a narrow
 * center column) plus a sticky sidebar carrying a same-page table of
 * contents and a few tool shortcuts — the kind of secondary navigation a
 * long reference page can support once it isn't fighting for the same
 * horizontal space as the prose.
 */
export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-10">
        <div className="max-w-3xl">
          <p className="kicker text-accent">New here?</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            How to invest in PSE stocks, explained for total beginners
          </h1>
          <p className="mt-3 text-base leading-relaxed text-foreground/80">
            This page assumes zero background — no jargon left unexplained, no assumed knowledge of
            how the stock market works. PSEye can show you every listed company, what it&apos;s
            worth, and how it&apos;s been trading — but it&apos;s a tracker, not a brokerage, so it
            can&apos;t place an order for you. This guide covers everything from what a share of
            stock actually is, to how money is made or lost owning one, to the practical steps of
            opening an account and placing your first order.
          </p>
          <p className="mt-3 rounded-lg bg-panel-raised px-3.5 py-2.5 text-sm leading-relaxed text-foreground/70 ring-1 ring-panel-border">
            Worth saying up front: investing in stocks carries real risk of loss. Only invest money
            you can afford to have tied up or lose, take time to understand what you&apos;re buying,
            and treat everything below as general information, not personalized financial advice.
          </p>

          <div className="mt-8 flex flex-col gap-8 text-base leading-relaxed text-foreground/80">
            <section id="what-is-a-stock" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>1. What is a stock, actually?</h2>
              <p className="mt-2">
                A share of stock is a tiny slice of ownership in a real company. If a company has,
                say, a billion shares outstanding and you own one, you technically own a
                one-billionth slice of it — of its stores or factories, its profit, and its say in
                how it&apos;s run. Buy a whole{" "}
                <Link href="/glossary/board-lot" className="underline hover:no-underline">
                  board lot
                </Link>{" "}
                and you own that many times more.
              </p>
              <p className="mt-2">
                The &ldquo;stock market&rdquo; — the Philippine Stock Exchange, or PSE — is simply
                where those slices change hands. Think of it as one continuous auction: buyers say
                what they&apos;re willing to pay, sellers say what they&apos;ll accept, and a trade
                happens the instant the two sides agree on a price. Nobody sets that price by
                decree — it moves because what buyers and sellers are willing to do keeps changing,
                thousands of times a day, every trading day.
              </p>
            </section>

            <section id="how-money-grows" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>2. How does your money actually grow?</h2>
              <p className="mt-2">
                There are only two ways a stock puts money in your pocket. Here&apos;s what each one
                looks like with real, round numbers — hypothetical examples, not a forecast or a
                real stock&apos;s actual history:
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {MONEY_EXAMPLES.map((ex) => (
                  <div key={ex.title} className="rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border">
                    <h3 className="text-sm font-semibold text-foreground">{ex.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/72">{ex.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground/60">
                All figures above are illustrative round numbers, not a prediction, backtest, or
                recommendation for any specific stock. To see a real company&apos;s actual price
                history, open its page from the{" "}
                <Link href="/stocks" className="underline hover:no-underline">
                  full stock list
                </Link>
                , or run your own numbers in the{" "}
                <Link href="/dca" className="underline hover:no-underline">
                  DCA calculator
                </Link>
                .
              </p>
            </section>

            <section id="open-account" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>3. Open a brokerage account</h2>
              <p className="mt-2">
                Every order on the PSE goes through a PSE-accredited stockbroker (the exchange calls
                them &ldquo;Trading Participants&rdquo;). There&apos;s no way to buy shares directly
                from the exchange or from PSEye. Several accept online applications with no branch
                visit required — you&apos;ll typically need a valid government ID, a TIN, and proof
                of address, plus whatever initial deposit that broker sets. Requirements, fees, and
                minimum deposits vary by broker and change over time, so confirm current numbers
                directly with whichever one you&apos;re considering before applying.
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg ring-1 ring-panel-border">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="bg-panel-raised text-left text-xs uppercase tracking-[0.04em] text-foreground/55">
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
              <p className="mt-2 text-sm text-foreground/60">
                Not an exhaustive list, and not a recommendation of any one broker over another —
                just the more commonly used online options, to give you a starting point.{" "}
                <a
                  href="https://www.pse.com.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  PSE&apos;s own website
                </a>{" "}
                publishes the full, current list of accredited trading participants. A bank-linked
                broker is usually the path of least friction if you already bank with that
                institution (funds move between accounts fastest); a standalone broker or app works
                the same regardless of which bank you use.
              </p>
            </section>

            <section id="key-terms" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>4. Learn the handful of terms that actually matter</h2>
              <p className="mt-2">
                You don&apos;t need to understand Sharpe ratios or RSI to place a first order, just a
                few mechanical terms. Shares trade in fixed board lots (you can&apos;t buy half a
                lot), the market only takes orders during{" "}
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

            <section id="place-order" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>5. Fund your account and place an order</h2>
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

            <section id="research-tools" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>6. Come back to PSEye to do the research</h2>
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
                to see what a fixed monthly amount would have grown to. None of it replaces your own
                judgment or a licensed advisor&apos;s.
              </p>
            </section>

            <section id="costs" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>7. What it actually costs</h2>
              <p className="mt-2">
                Beyond the price of the shares themselves, three costs apply to a typical trade:
                your broker&apos;s own commission (a small percentage of trade value, often with a
                minimum peso fee, plus VAT — the exact rate varies by broker), a PSE/SCCP clearing
                fee, and &mdash; on the sell side only &mdash; a{" "}
                <Link href="/glossary/stock-transaction-tax" className="underline hover:no-underline">
                  0.6% stock transaction tax
                </Link>{" "}
                deducted automatically from the proceeds. Cash dividends have their own separate 10%
                final withholding tax deducted before they reach your account, so a stock
                page&apos;s dividend yield is the gross figure, not what actually lands in your bank.
                None of these are something you calculate or file yourself &mdash; your broker
                handles the deductions, and none of this is tax advice for your specific situation.
              </p>
            </section>

            <section id="mistakes" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>8. Common first-timer mistakes</h2>
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
                  Commission and the stock transaction tax are charged per trade regardless of size,
                  so frequent small trades quietly eat more of the return than the same money moved
                  less often.
                </li>
                <li>
                  <span className="text-foreground">Reaching for margin or leverage before understanding it.</span>{" "}
                  Borrowing to invest amplifies losses the same way it amplifies gains — worth
                  understanding thoroughly, and asking your broker to explain in full, before ever
                  using it. PSEye doesn&apos;t cover margin trading.
                </li>
              </ul>
            </section>

            <section id="next-steps" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>9. Where to go next</h2>
              <p className="mt-2">Once the account and first order are sorted, these are the tools worth knowing about:</p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {NEXT_TOOLS.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border transition-colors hover:bg-panel-active"
                  >
                    <span className="text-base font-medium text-foreground">{t.label}</span>
                    <p className="mt-0.5 text-sm leading-snug text-foreground/65">{t.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div id="faq" className="scroll-mt-20">
            <MarketMapFaq items={FAQ} large />
          </div>

          <p className="mt-8 border-t border-foreground/10 pt-5 text-sm text-foreground/65">
            Nothing on this page or anywhere else on PSEye is financial advice, a stock pick, or a
            buy/sell signal. See{" "}
            <Link href="/about" className="underline hover:no-underline">
              About PSEye
            </Link>
            .
          </p>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <nav aria-label="On this page" className="rounded-lg bg-panel-raised p-4 ring-1 ring-panel-border">
            <p className="kicker text-foreground/55">On this page</p>
            <ul className="mt-2.5 flex flex-col gap-2 text-sm">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-foreground/70 hover:text-foreground hover:underline">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Jump to a tool" className="mt-4 rounded-lg bg-panel-raised p-4 ring-1 ring-panel-border">
            <p className="kicker text-foreground/55">Jump to a tool</p>
            <ul className="mt-2.5 flex flex-col gap-2 text-sm">
              {NEXT_TOOLS.slice(0, 4).map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="text-foreground/70 hover:text-foreground hover:underline">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
