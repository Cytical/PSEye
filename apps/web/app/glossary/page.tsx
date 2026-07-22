import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/glossary";

export const revalidate = 86400; // definitions don't change daily — same cadence as /dca

export const metadata: Metadata = {
  title: "PSE Investing Glossary — Terms Explained",
  description:
    "Plain-English definitions for the Philippine Stock Exchange terms PSEye actually uses — market cap, dividend yield, free float, foreign flow, board lot, and more.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Glossary", item: `${siteUrl}/glossary` },
        ],
      },
      {
        "@type": "DefinedTermSet",
        name: "PSE Investing Glossary",
        url: `${siteUrl}/glossary`,
        hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
          "@type": "DefinedTerm",
          name: t.term,
          description: t.definition,
          url: `${siteUrl}/glossary#${t.id}`,
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Glossary</span>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-panel-fg">PSE Investing Glossary</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-panel-fg/60">
        Plain-English definitions for the terms used across PSEye — every entry here is something
        this site actually computes or displays, not a generic finance dictionary.
      </p>

      <nav aria-label="Jump to term" className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {GLOSSARY_TERMS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="text-panel-fg/60 hover:text-panel-fg hover:underline">
            {t.term}
          </a>
        ))}
      </nav>

      <dl className="mt-6 flex flex-col gap-6">
        {GLOSSARY_TERMS.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-20 border-t border-panel-border pt-4 first:border-t-0 first:pt-0">
            <dt className="text-base font-semibold text-panel-fg">{t.term}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-panel-fg/80">{t.definition}</dd>
            {t.related && t.related.length > 0 && (
              <dd className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {t.related.map((r) => (
                  <Link key={r.href} href={r.href} className="text-panel-fg/60 hover:text-panel-fg hover:underline">
                    See {r.label} →
                  </Link>
                ))}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
