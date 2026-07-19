import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with PSEye — report a data issue, ask a question, or just say hi.",
  alternates: { canonical: "/contact" },
};

const CONTACT_LINKS = [
  {
    href: "mailto:guiaomikhail@gmail.com",
    label: "guiaomikhail@gmail.com",
    sublabel: "Email",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 6-10 7L2 6" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/in/ezra-guiao/",
    label: "linkedin.com/in/ezra-guiao",
    sublabel: "LinkedIn",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
      </svg>
    ),
  },
  {
    href: "https://cytical.github.io/",
    label: "cytical.github.io",
    sublabel: "Personal Site",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
    ),
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Contact</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Spotted a data issue, have a question, or just want to say hi? PSEye is a solo, free,
        community-first project — reach out directly.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {CONTACT_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 rounded-lg border border-foreground/10 px-4 py-3 text-sm transition-colors hover:bg-foreground/5 dark:border-foreground/15 dark:hover:bg-foreground/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 dark:bg-foreground/10">
              {link.icon}
            </span>
            <span>
              <span className="block text-[11px] uppercase tracking-wide text-foreground/50">{link.sublabel}</span>
              <span className="font-medium text-foreground">{link.label}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
