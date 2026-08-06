/**
 * Assigns every story a desk: "Banking & Finance", "Energy & Power" and so
 * on, the way a real business section is organised.
 *
 * The feeds cannot supply this. Of the eight configured outlets, only
 * Inquirer and Rappler publish genuinely topical <category> tags; Manila
 * Bulletin and Manila Times tag literally every item "Business", and
 * Philstar and GMA send no categories at all. A section built on that would
 * be empty for most of the page, so the desk is derived here from the
 * headline and lede instead, which every outlet does supply.
 *
 * Deliberately a keyword lexicon rather than anything statistical, for the
 * same reason sentiment.ts is: it is inspectable, it is testable, a
 * mis-filed story is fixed by editing one array, and it costs nothing at
 * fetch time.
 */

export const NEWS_TOPICS = [
  "Earnings",
  "Markets",
  "Banking & Finance",
  "Energy & Power",
  "Property",
  "Consumer",
  "Infrastructure",
  "Telecom & Tech",
  "Mining",
  "Economy",
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

/**
 * Every story that matches nothing lands here. Not one of NEWS_TOPICS on
 * purpose: a desk with a name promises a subject, and "we could not tell" is
 * not a subject. The UI renders it last and unlabelled-ish rather than
 * pretending it is a beat.
 */
export const FALLBACK_TOPIC = "General Business";

/**
 * Ordered most specific to most general. First desk to match wins, so
 * "Economy" (which owns broad words like "inflation" and "GDP" that show up
 * incidentally in half of all business copy) sits last and only catches what
 * nothing narrower claimed. "Markets" leads because a story about a stock is
 * a markets story even when it is also about a bank.
 *
 * Every keyword is anchored at its left word boundary. A keyword written
 * with a trailing space is additionally anchored on the right, i.e. it only
 * matches as a whole word: that is what keeps "tax" out of "taxi", "ipo" out
 * of "Iponan", "ai" out of "said", "ore" out of "before" and "reit" out of
 * "reiterate". Everything else is a prefix match, so "power plant" also
 * catches "power plants" and "dividend" also catches "dividends" without
 * needing every inflection spelled out. See buildMatchers below.
 */
const TOPIC_KEYWORDS: ReadonlyArray<readonly [NewsTopic, readonly string[]]> = [
  [
    "Earnings",
    [
      "net income",
      "earnings",
      "profit",
      "revenues",
      "revenue rose",
      "revenue fell",
      "first-half",
      "first half",
      "nine-month",
      "full-year",
      "quarterly results",
      "bottom line",
      "topline",
      "attributable net",
      "core income",
      "ebitda",
    ],
  ],
  [
    "Markets",
    [
      "psei",
      "pse index",
      "stock market",
      "stocks close",
      "share price",
      "shares rose",
      "shares fell",
      "index closed",
      "bourse",
      "initial public offering",
      "ipo ",
      "follow-on offering",
      "stock rights",
      "block sale",
      "buyback",
      "share buyback",
      "listing debut",
      "market cap",
      "ipos",
      "trading halt",
      "sec rule",
      "securities and exchange",
      "broker",
      "term limit",
      // Whole word, so it covers "raises its stake to 10%" and "buys a stake
      // in" alike without also matching "high-stakes".
      "stake ",
      "stakes ",
      "acquisition",
      "acquire",
      "merger",
      "takeover",
      "divest",
      "go-private",
      "forbes",
      "rich list",
      "shareholder",
      "bourses",
      "foreign buying",
      "foreign selling",
      "dividend",
      "cash dividend",
      "bond offer",
      "bond issue",
      "retail treasury bond",
      "preferred shares",
    ],
  ],
  [
    "Banking & Finance",
    [
      "bangko sentral",
      "bsp ",
      "central bank",
      "policy rate",
      "interest rate",
      "reserve requirement",
      "unibank",
      "rural bank",
      "lender",
      "lending",
      "loan",
      "deposit",
      "remittance",
      "insurance",
      "insurer",
      "pdic",
      "fintech",
      "e-wallet",
      "gcash",
      "maya",
      "digital bank",
      "banking",
      "banks ",
      "pera ",
      "retirement fund",
      "mutual fund",
      "unit investment trust",
      "trust fund",
      "pension",
      "credit rating",
      "npl ",
      "npls",
      "non-performing",
    ],
  ],
  [
    "Energy & Power",
    [
      "meralco",
      "power grid",
      "electricity",
      "kilowatt",
      "kwh",
      "megawatt",
      "power plant",
      "coal plant",
      "yellow alert",
      "red alert",
      "renewable",
      "solar",
      "wind farm",
      "geothermal",
      "hydropower",
      "oil price",
      "fuel price",
      "petroleum",
      "gasoline",
      "diesel",
      "lng",
      "natural gas",
      "wesm",
      "spot power",
      "nuclear",
      "epira",
      "system loss",
      "power rates",
      "electric cooperative",
      "energy department",
      "department of energy",
      "erc ",
      "transco",
      "napocor",
    ],
  ],
  [
    "Property",
    [
      "real estate",
      "property developer",
      "condominium",
      "condo ",
      "residential",
      "office space",
      "vacancy rate",
      "township",
      "land bank of",
      "leasing",
      "mall operator",
      "hotel",
      "resort",
      "reit ",
      "reits",
      "warehouse",
      "industrial park",
      "housing",
      "subdivision",
      "residences",
      "condominiums",
      "office tower",
      "topping off",
      "tops off",
      "land development",
    ],
  ],
  [
    "Consumer",
    [
      "retailer",
      "retail sales",
      "restaurant",
      "fast food",
      "food and beverage",
      "beverage",
      "grocery",
      "supermarket",
      "consumer goods",
      "shopper",
      "e-commerce",
      "online selling",
      "franchise",
      "tourism",
      "tourist arrivals",
      "airline",
      "air travel",
      "flight",
      "airfare",
      "seat sale",
      "budget carrier",
      "passenger",
      "poultry",
      "livestock",
      "rice ",
      "sugar",
      "agriculture",
      "farm output",
      "fisheries",
    ],
  ],
  [
    "Infrastructure",
    [
      "infrastructure",
      "expressway",
      "toll road",
      "railway",
      "rail project",
      "mrt",
      "lrt",
      "subway",
      "airport",
      "seaport",
      "port operator",
      "bridge project",
      "public-private partnership",
      "ppp project",
      "construction",
      "build build",
      "dpwh",
      "water district",
      "water concession",
      "dotr",
      "ltfrb",
      "fare hike",
      "aviation",
      "mro hub",
      "logistics hub",
    ],
  ],
  [
    "Telecom & Tech",
    [
      "telco",
      "telecom",
      "pldt",
      "globe telecom",
      "converge",
      "dito ",
      "broadband",
      "fiber",
      "5g",
      "mobile data",
      "wifi",
      "wi-fi",
      "connectivity",
      "cell site",
      "data center",
      "artificial intelligence",
      "ai ",
      "semiconductor",
      "chip ",
      "chips",
      "chipmaker",
      "software",
      "cybersecurity",
      "startup",
      "digital economy",
      "outsourcing",
      "bpo",
      "information technology",
    ],
  ],
  [
    "Mining",
    [
      "mining",
      "miner",
      "nickel",
      "copper",
      "gold mine",
      "gold price",
      "gold ",
      "bullion",
      "ore ",
      "mineral",
      "quarry",
      "smelter",
      "mgb",
      "mines and geosciences",
      "open-pit",
      "tailings",
    ],
  ],
  [
    "Economy",
    [
      "inflation",
      "gdp",
      "gross domestic product",
      "economic growth",
      "trade deficit",
      "free trade",
      "trade deal",
      "trade agreement",
      "sme ",
      "smes",
      "msme",
      "trade surplus",
      "balance of payments",
      "peso",
      "exchange rate",
      "unemploy",
      "jobless",
      "labor force",
      "wage hike",
      "minimum wage",
      "budget deficit",
      "national budget",
      "tax ",
      "taxes",
      "taxation",
      "tariff",
      "import ",
      "imports",
      "export ",
      "exports",
      "imf ",
      "world bank",
      "adb ",
      "psa ",
      "statistics authority",
      "neda",
      "department of finance",
      "recession",
      "fiscal",
    ],
  ],
];

/**
 * Compiles each keyword into a regex once at module load rather than per
 * story: classifyTopic runs on every item of every feed on every fetch, and
 * building ~300 regexes each time would be the most expensive thing in the
 * job by a wide margin.
 *
 * A trailing space on the keyword means "whole word" and compiles to a
 * closing \b; everything else stays a prefix so plurals come along for free.
 * The leading \b is unconditional, which is the half of the boundary the
 * previous space-padding version could not express at all.
 */
function buildMatchers(): ReadonlyArray<readonly [NewsTopic, readonly RegExp[]]> {
  return TOPIC_KEYWORDS.map(([topic, keywords]) => [
    topic,
    keywords.map((keyword) => {
      const wholeWord = keyword.endsWith(" ");
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}${wholeWord ? "\\b" : ""}`, "i");
    }),
  ]);
}

const TOPIC_MATCHERS = buildMatchers();

/** The desk a story belongs to, or FALLBACK_TOPIC when nothing matched. */
export function classifyTopic(text: string): NewsTopic | typeof FALLBACK_TOPIC {
  const haystack = text.replace(/\s+/g, " ");
  for (const [topic, matchers] of TOPIC_MATCHERS) {
    if (matchers.some((matcher) => matcher.test(haystack))) return topic;
  }
  return FALLBACK_TOPIC;
}

/** Narrows the DB's plain `string | null` back to the union, the same way
 * isNewsSentiment does for sentiment in apps/web/lib/news.ts. Accepts
 * FALLBACK_TOPIC too, since that is a legitimate stored value. */
export function isNewsTopic(value: string | null): value is NewsTopic | typeof FALLBACK_TOPIC {
  return value === FALLBACK_TOPIC || (NEWS_TOPICS as readonly string[]).includes(value ?? "");
}

/**
 * Every desk a story can end up on, including the catch-all.
 *
 * FALLBACK_TOPIC is deliberately part of this list even though it is not one
 * of NEWS_TOPICS: once each desk has its own browsable page, a story filed
 * nowhere else still has to be reachable, or a chunk of the corpus becomes
 * invisible the moment the front page stops printing every headline.
 */
export const NEWS_DESKS = [...NEWS_TOPICS, FALLBACK_TOPIC] as const;

export type NewsDesk = (typeof NEWS_DESKS)[number];

/**
 * URL slug for a desk, e.g. "Banking & Finance" -> "banking-and-finance".
 *
 * Same transform as apps/web/lib/sectorSlug.ts's sectorToSlug, deliberately:
 * /sectors/[sector] already established that shape for this site's other
 * name-keyed subpages, and two different slug conventions for two lists of
 * category names is the kind of inconsistency that only shows up later as a
 * broken hand-typed URL.
 */
export function topicToSlug(topic: NewsDesk): string {
  return topic.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-");
}

const SLUG_TO_DESK = new Map<string, NewsDesk>(NEWS_DESKS.map((d) => [topicToSlug(d), d]));

/** The desk a slug names, or null when it names nothing (a 404, not a
 * silently-empty page). */
export function slugToTopic(slug: string): NewsDesk | null {
  return SLUG_TO_DESK.get(slug.toLowerCase()) ?? null;
}
