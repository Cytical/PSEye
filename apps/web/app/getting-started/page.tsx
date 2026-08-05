import type { Metadata } from "next";
import Link from "next/link";
import { MarketMapFaq } from "@/components/MarketMapFaq";

export const metadata: Metadata = {
  title: "How to Invest in PSE Stocks for Beginners",
  description:
    "A plain-English guide to investing in the Philippine Stock Exchange: what a stock actually is, how the exchange and the PSEi work, how your money grows, risk and diversification, comparing brokers like COL Financial, BPI Trade, and DragonFi, board lots and order types, placing your first order, dividends, fees and taxes, and how to research a stock before you buy.",
  alternates: { canonical: "/getting-started" },
};

/** Jump links into the numbered sections below, rendered as a sticky sidebar
 * on desktop only, see the layout comment above the page component for why
 * the sidebar exists at all. Ids must match each <section id>. */
const TOC: { id: string; label: string }[] = [
  { id: "what-is-a-stock", label: "What is a stock?" },
  { id: "how-exchange-works", label: "How the exchange works" },
  { id: "reading-a-quote", label: "Reading a stock quote" },
  { id: "how-money-grows", label: "How your money grows" },
  { id: "risk-diversification", label: "Risk and diversification" },
  { id: "open-account", label: "Open a brokerage account" },
  { id: "board-lots-orders", label: "Board lots and order types" },
  { id: "place-order", label: "Place your first order" },
  { id: "dividends", label: "Dividends explained" },
  { id: "evaluating-stocks", label: "Evaluating a stock" },
  { id: "research-tools", label: "Research on PSEye" },
  { id: "costs", label: "What it costs" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "next-steps", label: "Where to go next" },
  { id: "faq", label: "FAQ" },
];

// Deliberately doesn't re-cover ground the numbered walkthrough already
// answers (opening an account, board lots, placing an order): these are the
// next layer of questions a beginner has once those mechanics are covered:
// money/risk/legitimacy concerns, not process steps.
const FAQ = [
  {
    q: "How much money do I need to start?",
    a: "There's no exchange-wide minimum. It depends on the stock's board lot size and price (a single lot of a low-priced stock can cost well under ₱1,000), plus your broker's own minimum initial deposit, which varies by broker. Some are built around small first-time accounts, others expect more, so check the specific broker's current requirement before assuming either way.",
  },
  {
    q: "Can I lose more money than I invested?",
    a: "Not through a plain cash purchase of shares. The most a stock position can lose is what you paid for it, if the price falls all the way to zero. That's different from margin trading or derivatives, neither of which PSEye covers.",
  },
  {
    q: "Is the Philippine Stock Exchange legitimate and regulated?",
    a: "Yes. The PSE is the country's sole stock exchange, regulated by the Securities and Exchange Commission, with trades cleared and settled through regulated infrastructure, not something informal. That doesn't make any individual stock a safe bet, since a company can still lose value or fail, but the exchange and settlement system itself is standard, regulated market plumbing.",
  },
  {
    q: "How do I actually make money from a stock?",
    a: "Two ways: selling shares for more than you paid for them, and cash dividends some companies pay out of profit. Neither is guaranteed. A stock can also fall in price or never pay a dividend.",
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
    q: "What is the PSEi, and does it matter to my own holdings?",
    a: "The PSEi is the exchange's benchmark index, a weighted average of roughly 30 of the largest, most-traded companies, used as shorthand for how the overall market is doing. A headline saying the PSEi rose or fell tells you nothing directly about any one stock you own outside that list, though it's useful context for the general mood of the market.",
    href: "/glossary/psei",
    hrefLabel: "See the PSEi glossary entry →",
  },
  {
    q: "Are dividends taxed?",
    a: "Yes. Cash dividends from PSE-listed companies carry a 10% final withholding tax, deducted automatically before the cash reaches your account. You don't calculate or file this yourself, and it's separate from the 0.6% stock transaction tax charged when you sell shares.",
    href: "#dividends",
    hrefLabel: "Read the dividends section →",
  },
  {
    q: "Do PSEye's prices update live during the trading day?",
    a: "No. PSEye's quotes are delayed or end-of-day, not a live tick-by-tick feed. Always check your broker's own quote before an order goes in, especially for a fast-moving stock.",
  },
  {
    q: "Is PSEye affiliated with any broker, or with the PSE itself?",
    a: "No. PSEye is an independent, community-built tracker with no brokerage relationship and no official affiliation with the Philippine Stock Exchange. It reads the same public disclosures and reports anyone can access, and it doesn't recommend one broker over another.",
    href: "/about",
    hrefLabel: "About PSEye →",
  },
  {
    q: "How long does opening a brokerage account take?",
    a: "For most online brokers, a few business days once you've submitted a valid government ID and the other standard KYC requirements. Some approve an account within 24-48 hours, though funding it and placing a first order can take a little longer depending on your bank transfer method.",
  },
  {
    q: "What happens to my shares if a company gets suspended from trading?",
    a: "You still own them. A trading suspension halts buying and selling, it doesn't cancel existing ownership. You simply can't trade that stock until PSE lifts the suspension, which can take anywhere from a day to much longer depending on the reason.",
    href: "/glossary/suspended",
    hrefLabel: "See the Suspended glossary entry →",
  },
  {
    q: "Can OFWs or foreign investors buy PSE stocks?",
    a: "Generally yes. Non-Filipino investors and overseas Filipino workers can typically open a brokerage account, subject to whatever foreign-ownership limits apply to a given company and the specific requirements of the broker involved. Some brokers offer account types built specifically for OFWs or non-resident applicants, so it's worth asking directly rather than assuming a standard local account applies.",
  },
  {
    q: "What's the difference between researching fundamentals and technicals on PSEye?",
    a: "Fundamentals look at the underlying business, profit, book value, and dividend history. Technicals look at the stock's own price and trading patterns, like moving averages and RSI. PSEye has real data for both, and most investors use a mix rather than picking one exclusively.",
    href: "#evaluating-stocks",
    hrefLabel: "Read the evaluating a stock section →",
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
    note: "The Philippines' oldest and largest online-only broker, with a deep bench of free research reports, screeners, and beginner guides built into the platform.",
  },
  {
    name: "BPI Trade",
    type: "Bank-linked (BPI)",
    note: "Run by BPI. Most convenient if you already hold a BPI account, since funding and withdrawing tends to be fastest between accounts at the same bank.",
  },
  {
    name: "First Metro Sec (FirstMetroSec)",
    type: "Bank-linked (Metrobank)",
    note: "Backed by Metrobank's First Metro Investment Corp, the same bank-linked convenience as BPI Trade, for Metrobank clients.",
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
    note: "One of the longest-running brokers in the market (formerly ATR Kim Eng), offering both self-service online trading and broker-assisted service for a more hands-on relationship.",
  },
  {
    name: "Philstocks (Wealth Securities)",
    type: "Standalone (any bank)",
    note: "Historically positioned toward smaller, first-time accounts. Worth comparing if a lower initial deposit matters most to you.",
  },
  {
    name: "AAA Southeast Equities",
    type: "Standalone (any bank)",
    note: "Another standalone option with its own mobile app, independent of any particular bank relationship.",
  },
];

/** Three concrete, hypothetical ways a stock position's value can change,
 * the direct answer to "how does my money actually grow," which nothing
 * elsewhere on this page previously spelled out in plain numbers. Every
 * figure is a round, made-up example, not a real ticker's history (that
 * belongs on the stock's own page or the DCA calculator, run on real data),
 * so this can't be mistaken for a forecast or backtest. */
const MONEY_EXAMPLES: { title: string; body: string }[] = [
  {
    title: "Selling for more than you paid",
    body: "Buy 1 board lot (100 shares) of a ₱120 stock for ₱12,000. A year later it's ₱132 (up 10%). Sell, and your shares are worth ₱13,200: a ₱1,200 gain, before fees and tax. The same stock could just as easily have fallen to ₱108 instead, a ₱1,200 loss. That two-sided swing is the core trade-off of owning a stock.",
  },
  {
    title: "Getting paid just to hold it",
    body: "Some companies pay a cash dividend, a slice of profit paid straight to shareholders. Say a company pays ₱3 per share once a year and you own 100 shares: you'd receive ₱300 in cash, on top of whatever the shares themselves are worth. Not every company pays one, and the amount isn't guaranteed year to year.",
  },
  {
    title: "Growing it steadily over time",
    body: "Instead of one lump sum, invest a fixed amount on a regular schedule (say ₱2,000 every month), buying more shares when prices are low and fewer when they're high. This is dollar-cost averaging. PSEye's DCA calculator shows what a specific monthly amount would have grown to, historically, for any tracked stock.",
  },
];

/** Plain-language field guide to the numbers that show up next to almost
 * every stock, both on PSEye and on a broker's own platform. Kept separate
 * from the glossary itself (which is exhaustive and alphabetical) since a
 * first-time reader needs these five specifically, in the order they'd
 * actually notice them looking at a stock page, not the full 39-term list. */
const QUOTE_FIELDS: { term: string; href?: string; body: string }[] = [
  {
    term: "Ticker",
    body: "A short code, usually a handful of letters, standing in for a company's full name. Search any of the 282 tracked companies by name or ticker from the full stock list or the Explorer.",
  },
  {
    term: "Price and % change",
    body: "The last traded price, and how far that is from the previous day's close. PSEye colors a gain green and a loss red, the same up/down convention most brokers use.",
  },
  {
    term: "Volume and value",
    href: "/glossary/trading-value-volume",
    body: "Volume is how many shares changed hands today; value is the peso amount those trades were worth. Value is the more useful number for comparing activity across stocks at very different prices.",
  },
  {
    term: "Market cap and free float",
    href: "/glossary/market-capitalization",
    body: "Market cap is a company's total value on the exchange (price times shares outstanding). Free float is the percentage of those shares actually available for public trading, rather than locked up by a controlling owner.",
  },
  {
    term: "52-week high and low",
    href: "/glossary/52-week-high-low",
    body: "The highest and lowest closing price a stock has recorded over the trailing year, a quick reference for how far today's price sits from its recent extremes.",
  },
];

/** Internal tools worth knowing about once the mechanics (this page) are out
 * of the way, grouped by what a beginner would actually reach for first
 * (research a specific stock, find one worth researching, then plan/track),
 * rather than the nav's own topic-based grouping which assumes more context
 * than a first-time visitor has yet. The sidebar reuses the first four as a
 * standing shortcut list; the full set with descriptions still gets its own
 * section further down for anyone reading top to bottom. */
const NEXT_TOOLS: { href: string; label: string; description: string }[] = [
  {
    href: "/glossary",
    label: "Glossary",
    description: "Every term used on PSEye, defined in plain English, the fastest way to look something up.",
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
 * contents and a few tool shortcuts, the kind of secondary navigation a
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
            This page assumes zero background: no jargon left unexplained, no assumed knowledge of
            how the stock market works. PSEye can show you every listed company, what it&apos;s
            worth, and how it&apos;s been trading. It&apos;s a tracker though, not a brokerage, so it
            can&apos;t place an order for you. This guide covers everything from what a share of
            stock actually is, to how the exchange and the PSEi work, to how money is made or lost
            owning one, to the practical steps of opening an account and placing your first order,
            plus dividends, fees, risk, and how to research a stock once you own it.
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
                one-billionth slice of it: of its stores or factories, its profit, and its say in
                how it&apos;s run. Buy a whole{" "}
                <Link href="/glossary/board-lot" className="underline hover:no-underline">
                  board lot
                </Link>{" "}
                and you own that many times more.
              </p>
              <p className="mt-2">
                Owning a share generally comes with three things. A claim on a slice of the
                company&apos;s future profit, whether or not it actually pays that out as a
                dividend. A vote at the company&apos;s annual shareholder meeting, roughly one vote
                per share, though in practice most retail investors never attend and either vote by
                proxy or don&apos;t vote at all. And a claim on whatever&apos;s left of the
                company&apos;s assets if it ever shuts down, after every creditor, supplier, and
                bondholder gets paid first, which in practice is usually little or nothing.
              </p>
              <p className="mt-2">
                The &ldquo;stock market&rdquo;, the Philippine Stock Exchange, or PSE, is simply
                where those slices change hands. Think of it as one continuous auction: buyers say
                what they&apos;re willing to pay, sellers say what they&apos;ll accept, and a trade
                happens the instant the two sides agree on a price. Nobody sets that price by
                decree. It moves because what buyers and sellers are willing to do keeps changing,
                thousands of times a day, every trading day.
              </p>
            </section>

            <section id="how-exchange-works" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>2. How the exchange, and the PSEi, actually work</h2>
              <p className="mt-2">
                The PSE is the only stock exchange in the country, and it only takes orders during{" "}
                <Link href="/glossary/trading-hours" className="underline hover:no-underline">
                  PSE trading hours
                </Link>
                , Monday to Friday, with a lunch recess in the middle and a short pre-close window
                before it shuts for the day. Outside those hours, whatever price you see anywhere,
                including on PSEye, is simply the last one recorded, not a live number still moving.
              </p>
              <p className="mt-2">
                Every listed company sits under one{" "}
                <Link href="/glossary/sector" className="underline hover:no-underline">
                  PSE sector
                </Link>{" "}
                such as Financials, Property, or Industrial, and the exchange tracks the overall
                market through the{" "}
                <Link href="/glossary/psei" className="underline hover:no-underline">
                  PSEi
                </Link>
                , a weighted average of roughly 30 of the largest, most heavily traded companies.
                When a headline says &ldquo;the market was up today,&rdquo; it almost always means
                the PSEi moved up, not that every single listed stock did. Browse the full sector
                breakdown on the{" "}
                <Link href="/sectors" className="underline hover:no-underline">
                  sectors
                </Link>{" "}
                page.
              </p>
              <p className="mt-2">
                A listed company can also be temporarily{" "}
                <Link href="/glossary/suspended" className="underline hover:no-underline">
                  suspended
                </Link>{" "}
                from trading, usually while it discloses material news or resolves a compliance
                issue. A suspension halts trading, it doesn&apos;t cancel your ownership, and PSEye
                shows a suspended stock&apos;s price as &ldquo;N/A&rdquo; rather than guessing or
                freezing on a stale number.
              </p>
            </section>

            <section id="reading-a-quote" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>3. Reading a stock quote</h2>
              <p className="mt-2">
                A handful of numbers show up next to almost every stock, on PSEye and on your
                broker&apos;s platform alike. Knowing what each one means before your first order
                makes the rest of this guide, and every stock page on this site, much easier to read.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUOTE_FIELDS.map((f) => (
                  <div key={f.term} className="rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border">
                    <h3 className="text-sm font-semibold text-foreground">
                      {f.href ? (
                        <Link href={f.href} className="underline hover:no-underline">
                          {f.term}
                        </Link>
                      ) : (
                        f.term
                      )}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/72">{f.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="how-money-grows" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>4. How does your money actually grow?</h2>
              <p className="mt-2">
                There are only two ways a stock puts money in your pocket. Here&apos;s what each one
                looks like with real, round numbers: hypothetical examples, not a forecast or a real
                stock&apos;s actual history.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {MONEY_EXAMPLES.map((ex) => (
                  <div key={ex.title} className="rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border">
                    <h3 className="text-sm font-semibold text-foreground">{ex.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/72">{ex.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3">
                These two effects build on each other over time. A dividend that gets reinvested
                buys more shares, which can then earn their own future dividends and rise in price
                too. That compounding effect is slow at first and easy to underestimate, which is
                part of why long holding periods and steady contributions, the idea behind
                dollar-cost averaging, tend to matter more than trying to time any single trade.
              </p>
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

            <section id="risk-diversification" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>5. Risk and diversification</h2>
              <p className="mt-2">
                Every stock carries risk, and no page on PSEye, including this one, can tell you how
                much risk is right for you. Two ideas are worth understanding early.{" "}
                <Link href="/glossary/volatility" className="underline hover:no-underline">
                  Volatility
                </Link>{" "}
                is how much a stock&apos;s price swings day to day, in either direction, and{" "}
                <Link href="/glossary/beta" className="underline hover:no-underline">
                  beta
                </Link>{" "}
                is how much of that swing tends to move together with the overall market. A stock
                with high volatility and a high beta can lose a large chunk of its value quickly in
                a downturn, and gain it back just as quickly in a rally. PSEye&apos;s{" "}
                <Link href="/analytics" className="underline hover:no-underline">
                  analytics
                </Link>{" "}
                page computes both for every tracked stock, alongside{" "}
                <Link href="/glossary/correlation" className="underline hover:no-underline">
                  correlation
                </Link>{" "}
                between stocks, one of the tools behind spreading money across companies that
                don&apos;t all move together.
              </p>
              <p className="mt-2">
                Diversification, buying more than one stock across more than one sector, is the most
                common way individual investors manage that risk without trying to predict which
                single company will do best. See how the market breaks down on the{" "}
                <Link href="/sectors" className="underline hover:no-underline">
                  sectors
                </Link>{" "}
                page, and keep in mind that a company&apos;s{" "}
                <Link href="/glossary/market-capitalization" className="underline hover:no-underline">
                  market capitalization
                </Link>{" "}
                says nothing on its own about how safe it is, only how large it is.
              </p>
              <p className="mt-2">
                A less obvious risk is liquidity. A stock with a small{" "}
                <Link href="/glossary/free-float" className="underline hover:no-underline">
                  free float
                </Link>{" "}
                or low{" "}
                <Link href="/glossary/trading-value-volume" className="underline hover:no-underline">
                  trading value
                </Link>{" "}
                can be hard to buy or sell at a reasonable price exactly when you want to, since
                there may simply not be another investor on the other side of the trade. Checking a
                stock&apos;s typical trading volume before buying is a habit worth building early.
              </p>
            </section>

            <section id="open-account" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>6. Open a brokerage account</h2>
              <p className="mt-2">
                Every order on the PSE goes through a PSE-accredited stockbroker (the exchange calls
                them &ldquo;Trading Participants&rdquo;). There&apos;s no way to buy shares directly
                from the exchange or from PSEye. In practice, opening an account with most online
                brokers looks something like this: pick a broker and start its online application,
                submit a valid government ID, your TIN, and proof of address, fund the account by
                bank transfer or over-the-counter deposit once it&apos;s approved, then log in and
                place your first order once the funds show as cleared. Requirements, fees, and
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
                Not an exhaustive list, and not a recommendation of any one broker over another,
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
                institution, since funds move between accounts fastest; a standalone broker or app
                works the same regardless of which bank you use.
              </p>
            </section>

            <section id="board-lots-orders" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>7. Board lots and order types, explained</h2>
              <p className="mt-2">
                Shares don&apos;t trade one at a time. Every stock has a minimum trade size called a{" "}
                <Link href="/glossary/board-lot" className="underline hover:no-underline">
                  board lot
                </Link>
                , set by PSE&apos;s own board lot table based on the stock&apos;s price range.
                Generally, the higher a stock&apos;s price, the smaller its board lot, and the lower
                the price, the larger the lot, so a low-priced stock and a high-priced one can have
                very different minimum trade sizes even though both trade in &ldquo;lots.&rdquo; You
                can&apos;t buy or sell a fraction of a board lot through a regular order, only whole
                multiples of it.
              </p>
              <p className="mt-2">
                When you place an order, you also choose how it fills. A{" "}
                <Link href="/glossary/market-order" className="underline hover:no-underline">
                  market order
                </Link>{" "}
                fills right away at whatever price is currently available, trading price certainty
                for the certainty of getting filled. A{" "}
                <Link href="/glossary/limit-order" className="underline hover:no-underline">
                  limit order
                </Link>{" "}
                only fills at a price you set, or better, which protects you from an unexpectedly
                bad fill but might not execute at all if the market never reaches your price. Most
                broker platforms default to a market order but let you switch to a limit order in
                the same form, and a limit order is generally the safer default for a first-time
                buyer since it caps what you actually pay, or the least you&apos;ll accept on a
                sale.
              </p>
              <p className="mt-2">
                As a worked example: say a stock last traded at ₱50.00. A market buy order fills
                near ₱50.00, at whatever the best available price is the moment the order reaches
                the exchange, which can land slightly above or below depending on how the order book
                looks right then. A limit buy order set at ₱49.50 only fills if the price actually
                trades down to ₱49.50 or lower, so you might pay less, but you also might not get
                filled at all if the stock never drops that far.
              </p>
              <p className="mt-2">
                The full{" "}
                <Link href="/glossary" className="underline hover:no-underline">
                  PSE investing glossary
                </Link>{" "}
                covers everything else you&apos;ll run into on PSEye, in plain English, and on the
                stock pages themselves, any term with a small{" "}
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-foreground/60 ring-1 ring-foreground/30">
                  i
                </span>{" "}
                next to it opens a quick definition on hover, with a link into the full entry.
              </p>
            </section>

            <section id="place-order" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>8. Fund your account and place your first order</h2>
              <p className="mt-2">
                PSEye&apos;s prices are delayed or end-of-day, not a live tick-by-tick feed, so check
                your broker&apos;s own quote before an order goes in. Once your account is funded,
                placing a buy order generally goes like this:
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>Log in to your broker&apos;s trading platform, web or mobile, once your account shows as funded.</li>
                <li>Search for the company by name or ticker symbol.</li>
                <li>Choose Buy, then enter a quantity in whole board lots.</li>
                <li>
                  Choose a market or limit order and, for a limit order, the price you&apos;re
                  willing to pay.
                </li>
                <li>
                  Review the order ticket, ticker, quantity, order type, price, and estimated total
                  including fees, before confirming. This is the moment to double-check you have the
                  right ticker: a mistyped or similarly named symbol is an easy way to buy the wrong
                  company.
                </li>
                <li>
                  Submit the order. A market order usually fills within seconds during trading hours;
                  a limit order may sit unfilled until the price is reached or the order expires.
                </li>
                <li>
                  Once filled, the trade{" "}
                  <Link href="/glossary/settlement-t2" className="underline hover:no-underline">
                    settles two business days later (T+2)
                  </Link>
                  , when the shares actually land in your account and show up in your broker&apos;s
                  portfolio view.
                </li>
              </ol>
            </section>

            <section id="dividends" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>9. Dividends, explained</h2>
              <p className="mt-2">
                A cash dividend is a slice of a company&apos;s profit paid directly to shareholders,
                usually once or twice a year, though not every company pays one and the amount is
                never guaranteed. Three dates matter, in this order: the declaration date, when the
                company&apos;s board announces the dividend and its amount, the{" "}
                <Link href="/glossary/ex-dividend-date" className="underline hover:no-underline">
                  ex-dividend date
                </Link>
                , the first day the stock trades without the right to that dividend, and the payment
                date, when the cash actually lands in your account. You need to own the stock before
                the ex-date, not on or after it, to receive that specific payout.
              </p>
              <p className="mt-2">
                A company can also pay a stock dividend instead of, or alongside, a cash one:
                additional shares handed out in proportion to what you already hold, rather than
                cash. It doesn&apos;t by itself make you richer, since the total value of your
                holding is unchanged, just more shares at a proportionally lower price each, but it
                does raise your share count for any future cash dividend calculated per share.
              </p>
              <p className="mt-2">
                A stock page&apos;s{" "}
                <Link href="/glossary/dividend-yield" className="underline hover:no-underline">
                  dividend yield
                </Link>{" "}
                figure on PSEye is trailing twelve months, meaning what a share actually paid out
                over the last year, not a promise of what it will pay next. See every upcoming
                ex-dividend date across all 282 tracked companies on the{" "}
                <Link href="/calendar" className="underline hover:no-underline">
                  calendar
                </Link>
                .
              </p>
            </section>

            <section id="evaluating-stocks" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>10. Evaluating a stock: fundamentals and technicals</h2>
              <p className="mt-2">
                There are two broad ways people size up a stock, and PSEye carries real data for
                both. Fundamental analysis asks what the underlying business is actually worth: its
                profit, and how much you&apos;re paying for that profit.{" "}
                <Link href="/glossary/earnings-per-share" className="underline hover:no-underline">
                  Earnings per share
                </Link>{" "}
                is profit divided by share count,{" "}
                <Link href="/glossary/book-value-per-share" className="underline hover:no-underline">
                  book value per share
                </Link>{" "}
                is roughly what each share would be worth if the company sold everything and paid
                off every debt today, and dividend yield is how much cash income the stock has paid
                relative to its price. All three come from a company&apos;s own real annual
                financial reports on its stock page, not an estimate. One common fundamental
                measure, the{" "}
                <Link href="/glossary/pe-ratio" className="underline hover:no-underline">
                  P/E ratio
                </Link>
                , is worth knowing about specifically because PSEye leaves it out: PSE&apos;s own
                company pages leave that field blank in practice, and no reliable free source fills
                the gap, so rather than guess a number, PSEye simply doesn&apos;t show one.
              </p>
              <p className="mt-2">
                Technical analysis instead studies a stock&apos;s own price history for patterns, on
                the theory that recent price behavior says something about what happens next. PSEye
                computes several of these for every tracked stock: moving averages,{" "}
                <Link href="/glossary/rsi" className="underline hover:no-underline">
                  RSI
                </Link>{" "}
                and{" "}
                <Link href="/glossary/macd" className="underline hover:no-underline">
                  MACD
                </Link>{" "}
                as momentum indicators, and volatility, beta, and correlation as risk measures, all
                on the{" "}
                <Link href="/analytics" className="underline hover:no-underline">
                  analytics
                </Link>{" "}
                page and each stock&apos;s own page. None of these predict the future with
                certainty. They describe what has already happened, and are one input among many,
                not a signal to blindly follow.
              </p>
              <p className="mt-2">
                Neither approach is the &ldquo;correct&rdquo; one on its own, and plenty of investors
                use a mix of both: fundamentals to help decide what to buy, technicals to help decide
                when.
              </p>
            </section>

            <section id="research-tools" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>11. Come back to PSEye to do the research</h2>
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
              <h2 className={SECTION_HEADING}>12. What it actually costs</h2>
              <p className="mt-2">
                Beyond the price of the shares themselves, three costs apply to a typical trade:
                your broker&apos;s own commission (a small percentage of trade value, often with a
                minimum peso fee, plus VAT, the exact rate varies by broker), a PSE and SCCP
                clearing fee, and, on the sell side only, a{" "}
                <Link href="/glossary/stock-transaction-tax" className="underline hover:no-underline">
                  0.6% stock transaction tax
                </Link>{" "}
                deducted automatically from the proceeds. Cash dividends have their own separate 10%
                final withholding tax deducted before they reach your account, so a stock
                page&apos;s dividend yield is the gross figure, not what actually lands in your bank.
                None of these are something you calculate or file yourself, your broker handles the
                deductions, and none of this is tax advice for your specific situation.
              </p>
              <div className="mt-3 rounded-lg bg-panel-raised p-3 ring-1 ring-panel-border">
                <h3 className="text-sm font-semibold text-foreground">A worked example</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/72">
                  Say a broker charges a 0.25% commission (an illustrative rate only, not any real
                  broker&apos;s actual fee) on a ₱10,000 buy order. That&apos;s roughly ₱25 in
                  commission, plus VAT on the commission and a small clearing fee, so your total cost
                  lands a little above ₱10,000. Selling that same position later adds the 0.6% stock
                  transaction tax on top of commission, roughly ₱60 on a ₱10,000 sale by itself.
                  Confirm your own broker&apos;s actual commission schedule directly, since it varies
                  and changes over time.
                </p>
              </div>
            </section>

            <section id="mistakes" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>13. Common first-timer mistakes</h2>
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
                  the whole account, see how holdings are grouped on the{" "}
                  <Link href="/sectors" className="underline hover:no-underline">
                    sector
                  </Link>{" "}
                  pages.
                </li>
                <li>
                  <span className="text-foreground">Reacting to every daily swing.</span>{" "}
                  A stock moving a few percent in a day is routine, not necessarily news, the{" "}
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
                  <span className="text-foreground">Ignoring liquidity.</span>{" "}
                  Buying a stock with very little daily trading value can mean paying more to buy
                  and getting less to sell than the last quoted price suggested, since there may
                  not be enough other trades happening at that price. Check a stock&apos;s trading
                  value before committing meaningfully to a thinly traded name.
                </li>
                <li>
                  <span className="text-foreground">Confusing price with value.</span>{" "}
                  A ₱5 stock isn&apos;t automatically cheaper than a ₱500 one, and a stock that has
                  fallen a lot isn&apos;t automatically a bargain. What matters is what
                  you&apos;re paying relative to the business, not the number on the ticker.
                </li>
                <li>
                  <span className="text-foreground">Reaching for margin or leverage before understanding it.</span>{" "}
                  Borrowing to invest amplifies losses the same way it amplifies gains, worth
                  understanding thoroughly, and asking your broker to explain in full, before ever
                  using it. PSEye doesn&apos;t cover margin trading.
                </li>
              </ul>
            </section>

            <section id="next-steps" className="scroll-mt-20">
              <h2 className={SECTION_HEADING}>14. Where to go next</h2>
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
