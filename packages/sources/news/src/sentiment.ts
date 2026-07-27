export type NewsSentiment = "positive" | "negative" | "neutral";

export interface SentimentResult {
  sentiment: NewsSentiment;
  /** positive-word-count minus negative-word-count — kept around for
   * debugging/tuning the lexicon, not persisted (news_items.sentiment only
   * stores the bucketed label; see fetch-news.ts). */
  score: number;
}

/**
 * Finance/business-news-tuned word lists, not a general sentiment lexicon —
 * e.g. "beat" (beat estimates), "downgrade" (analyst rating) read as
 * finance-specific senses a generic lexicon (AFINN, VADER, etc.) wouldn't
 * necessarily weight the same way. Deliberately simple (lexicon word-count,
 * not a trained model or paid AI API — this project is explicitly free/
 * no-paid-deps, see CLAUDE.md) and expected to be iterated on — see
 * scoreSentiment's own comment.
 */
const POSITIVE_WORDS = [
  "surge",
  "surges",
  "surged",
  "surging",
  "growth",
  "grow",
  "grows",
  "grew",
  "growing",
  "profit",
  "profits",
  "profitable",
  "beat",
  "beats",
  "outperform",
  "outperforms",
  "expansion",
  "expand",
  "expands",
  "expanded",
  "rally",
  "rallies",
  "rallied",
  "gain",
  "gains",
  "gained",
  "boost",
  "boosts",
  "boosted",
  "upgrade",
  "upgrades",
  "upgraded",
  "strong",
  "robust",
  "optimism",
  "optimistic",
  "recovery",
  "recovers",
  "recovered",
  "bullish",
  "milestone",
  "breakthrough",
  "win",
  "wins",
  "won",
  "soar",
  "soars",
  "soared",
  "jump",
  "jumps",
  "jumped",
  "rebound",
  "rebounds",
  "rebounded",
  "improve",
  "improves",
  "improved",
  "record high",
  "all-time high",
  "surplus",
  "dividend hike",
  "buyback",
];

const NEGATIVE_WORDS = [
  "plunge",
  "plunges",
  "plunged",
  "loss",
  "losses",
  "lawsuit",
  "lawsuits",
  "downgrade",
  "downgrades",
  "downgraded",
  "recall",
  "recalls",
  "recalled",
  "slump",
  "slumps",
  "slumped",
  "decline",
  "declines",
  "declined",
  "drop",
  "drops",
  "dropped",
  "fall",
  "falls",
  "fell",
  "falling",
  "fraud",
  "scandal",
  "bankrupt",
  "bankruptcy",
  "layoff",
  "layoffs",
  "cut",
  "cuts",
  "warns",
  "warning",
  "warned",
  "probe",
  "investigation",
  "crisis",
  "weak",
  "weakness",
  "bearish",
  "concern",
  "concerns",
  "tumble",
  "tumbles",
  "tumbled",
  "sink",
  "sinks",
  "sank",
  "suspend",
  "suspends",
  "suspended",
  "delist",
  "delists",
  "delisted",
  "penalty",
  "penalties",
  "fine",
  "fined",
  "shortfall",
  "deficit",
  "default",
  "defaults",
  "defaulted",
  "resign",
  "resigns",
  "resigned",
  "strike",
  "strikes",
  "shutdown",
  "impairment",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One alternation regex per list, compiled once at module load rather than
 * per scoreSentiment() call — this runs per article at ETL fetch time (see
 * rssSource.ts), not per page render, but there's no reason to redo the
 * regex-building work on every item either. \b keeps e.g. "cut" from
 * matching inside "cutting-edge" or "fall" inside "shortfall". */
function buildWordListPattern(words: string[]): RegExp {
  const alternation = words.map(escapeRegExp).join("|");
  return new RegExp(`\\b(?:${alternation})\\b`, "gi");
}

const POSITIVE_PATTERN = buildWordListPattern(POSITIVE_WORDS);
const NEGATIVE_PATTERN = buildWordListPattern(NEGATIVE_WORDS);

function countMatches(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

/**
 * Lexicon word-count sentiment over a headline (+ optional snippet) — pure,
 * synchronous, no network, same "testable pure function" shape as
 * tickerTagger.ts's tagTickers, which is exactly why this lives next to it
 * and is called the same way from rssSource.ts. Ties (score === 0, including
 * the common case of zero matches either way) bucket as "neutral" — most
 * generic wire-service business headlines aren't emotionally loaded either
 * direction, so neutral being the default/majority bucket is expected, not
 * a bug in the lexicon.
 */
export function scoreSentiment(text: string): SentimentResult {
  const positiveCount = countMatches(text, POSITIVE_PATTERN);
  const negativeCount = countMatches(text, NEGATIVE_PATTERN);
  const score = positiveCount - negativeCount;
  const sentiment: NewsSentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  return { sentiment, score };
}
