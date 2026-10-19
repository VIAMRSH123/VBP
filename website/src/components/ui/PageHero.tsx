import Link from "next/link";
import type { ReactNode } from "react";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";

type Crumb = { href: string; label: string };

type PageHeroProps = {
  eyebrow: string;
  lines: readonly string[];
  description?: string;
  crumbs?: readonly Crumb[];
  tone?: "light" | "dark";
  /** Optional right-hand block. Without it the masthead stays full width. */
  aside?: ReactNode;
};

/** The shared masthead for every page below the homepage. */
export function PageHero({
  eyebrow,
  lines,
  description,
  crumbs = [],
  tone = "light",
  aside,
}: PageHeroProps) {
  const isDark = tone === "dark";

  return (
    <section
      className={`grain relative overflow-hidden pt-[72px] ${
        isDark ? "dark-section" : "bg-ivory"
      }`}
    >
      <div
        className={`shell pb-16 pt-16 md:pb-24 md:pt-24 ${
          aside ? "md:grid md:grid-cols-12 md:items-end md:gap-10" : ""
        }`}
      >
        <div className={aside ? "md:col-span-6" : undefined}>
        {crumbs.length > 0 ? (
          <Reveal>
            <nav aria-label="Breadcrumb">
              <ol className="t-meta flex flex-wrap items-center gap-2 text-muted">
                {crumbs.map((crumb) => (
                  <li key={crumb.href} className="flex items-center gap-2">
                    <Link href={crumb.href} className="link-underline">
                      {crumb.label}
                    </Link>
                    <span aria-hidden="true" className="opacity-40">
                      /
                    </span>
                  </li>
                ))}
                <li aria-current="page" className={isDark ? "text-gold-soft" : "text-gold"}>
                  {eyebrow}
                </li>
              </ol>
            </nav>
          </Reveal>
        ) : (
          <Reveal>
            <p className={`t-meta ${isDark ? "text-gold-soft" : "text-gold"}`}>
              {eyebrow}
            </p>
          </Reveal>
        )}

        <TextReveal
          as="h1"
          immediate
          delay={0.1}
          lines={lines}
          className={`t-hero mt-7 max-w-[14ch] ${isDark ? "text-ivory" : "text-forest"}`}
        />

        {description ? (
          <Reveal delay={0.15}>
            <p
              className={`t-lead mt-8 max-w-[56ch] ${
                isDark ? "text-ivory/70" : "text-charcoal/75"
              }`}
            >
              {description}
            </p>
          </Reveal>
        ) : null}
        </div>

        {aside ? (
          <div className="mt-14 md:col-span-5 md:col-start-8 md:mt-0">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
