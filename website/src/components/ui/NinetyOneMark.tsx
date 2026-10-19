/**
 * The "91" watermark — India's dialling code, the mark stamped on every TFS
 * pack. Used as a quiet background device to tie sections together, never as
 * content. Always decorative, always `aria-hidden`.
 */

type NinetyOneMarkProps = {
  /** Tailwind positioning for the wrapper, e.g. "-bottom-8 -right-4". */
  className?: string;
  /** Tone of the numeral against its panel. */
  tone?: "light" | "dark" | "gold";
  size?: "sm" | "md" | "lg";
};

const tones = {
  light: "text-sand/70",
  dark: "text-ivory/[0.07]",
  gold: "text-gold/15",
} as const;

const sizes = {
  sm: "text-[6rem] md:text-[8rem]",
  md: "text-[9rem] md:text-[13rem]",
  lg: "text-[14rem] md:text-[22rem]",
} as const;

export function NinetyOneMark({
  className = "",
  tone = "dark",
  size = "md",
}: NinetyOneMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`t-index pointer-events-none absolute select-none leading-[0.75] ${sizes[size]} ${tones[tone]} ${className}`}
    >
      91
    </span>
  );
}
