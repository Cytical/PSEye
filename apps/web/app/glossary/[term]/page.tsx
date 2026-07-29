import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossary";

// Definitions don't change daily — same cadence as the glossary index and /dca.
export const revalidate = 86400;

export function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ term: t.id }));
}

function findTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term: id } = await params;
  const term = findTerm(id);
  if (!term) return {};

  return {
    title: `${term.question} | PSE Investing Glossary`,
    description: term.definition,
    alternates: { canonical: `/glossary/${term.id}` },
    openGraph: { title: term.question, description: term.definition },
  };
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term: id } = await params;
  const term = findTerm(id);
  if (!term) notFound();

  const index = GLOSSARY_TERMS.findIndex((t) => t.id === id);
  const prev = GLOSSARY_TERMS[index - 1];
  const next = GLOSSARY_TERMS[index + 1];
  const seeAlso = (term.seeAlso ?? [])
    .map((seeAlsoId) => findTerm(seeAlsoId))
    .filter((t): t is GlossaryTerm => t != null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Glossary", item: `${siteUrl}/glossary` },
          { "@type": "ListItem", position: 3, name: term.term, item: `${siteUrl}/glossary/${term.id}` },
        ],
      },
      {
        "@type": "DefinedTerm",
        name: term.term,
        description: term.definition,
        url: `${siteUrl}/glossary/${term.id}`,
        inDefinedTermSet: `${siteUrl}/glossary`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/glossary" className="hover:underline">
          Glossary
        </Link>
        <span className="mx-1.5">/</span>
        <span>{term.term}</span>
      </nav>

      <p className="kicker mt-2 text-accent">Reference</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        {term.question}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-panel-fg/85">{term.definition}</p>

      {term.related && term.related.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {term.related.map((r) => (
            <Link key={r.href} href={r.href} className="text-panel-fg/80 underline hover:text-panel-fg">
              See {r.label} →
            </Link>
          ))}
        </div>
      )}

      {seeAlso.length > 0 && (
        <div className="mt-8 border-t border-panel-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-panel-fg/60">See also</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {seeAlso.map((t) => (
              <Link key={t.id} href={`/glossary/${t.id}`} className="text-panel-fg/80 underline hover:text-panel-fg">
                {t.term}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-panel-border pt-5 text-sm">
        {prev ? (
          <Link href={`/glossary/${prev.id}`} className="text-panel-fg/72 hover:text-panel-fg hover:underline">
            ← {prev.term}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/glossary/${next.id}`} className="text-panel-fg/72 hover:text-panel-fg hover:underline">
            {next.term} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="mt-6 text-sm text-panel-fg/72">
        See every term in the{" "}
        <Link href="/glossary" className="underline hover:text-panel-fg">
          full PSE investing glossary
        </Link>
        .
      </p>
    </div>
  );
}
