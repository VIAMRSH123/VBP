import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";

type SectionHeadingProps = {
  index: string;
  label: string;
  lines: readonly string[];
  description?: string;
  id?: string;
  className?: string;
  /** Headings are h2 by default; pass h1 only on a page's primary heading. */
  as?: "h1" | "h2";
};

/**
 * The indexed section header used across the site — the "manifest" device that
 * gives the page its rhythm: 01 / PORTFOLIO over an editorial display line.
 */
export function SectionHeading({
  index,
  label,
  lines,
  description,
  id,
  className = "",
  as = "h2",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <Reveal className="hairline flex items-baseline gap-4 pt-4">
        <span className="t-index t-meta text-gold">{index}</span>
        <span className="t-meta text-muted">{label}</span>
      </Reveal>

      <TextReveal
        as={as}
        id={id}
        lines={lines}
        className="t-display mt-7 max-w-[18ch]"
      />

      {description ? (
        <Reveal delay={0.1}>
          <p className="t-lead mt-6 max-w-[52ch] opacity-70">{description}</p>
        </Reveal>
      ) : null}
    </div>
  );
}
