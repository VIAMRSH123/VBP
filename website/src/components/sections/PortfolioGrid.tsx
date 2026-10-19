import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NinetyOneMark } from "@/components/ui/NinetyOneMark";
import {
  categories,
  getProductsByCategory,
  type Category,
  type Product,
} from "@/content/products";

/** Deliberately uneven: a tall 7-wide feature, then 5/5, then a full-width band. */
const spans: Record<string, string> = {
  rice: "md:col-span-7 md:row-span-2",
  spices: "md:col-span-5",
  pulses: "md:col-span-5",
  sugar: "md:col-span-12",
};

type PanelProps = { category: Category; index: number; items: readonly Product[] };

function CountLine({ count, tone }: { count: number; tone: "dark" | "light" }) {
  return (
    <span className={`t-meta ${tone === "dark" ? "text-ivory/50" : "text-muted"}`}>
      {count} {count === 1 ? "product" : "products"}
    </span>
  );
}

/**
 * The Rice panel earns the extra space by listing the range inside it — the
 * seven varieties and their trade weights, which is exactly what a buyer
 * scanning the page wants to see before clicking.
 */
function FeaturePanel({ category, index, items }: PanelProps) {
  return (
    <Link
      href={`/products/${category.slug}`}
      data-cursor-label="VIEW"
      className="dark-section group relative flex h-full flex-col overflow-hidden bg-forest p-8 md:p-10"
    >
      <NinetyOneMark className="-left-6 top-[18%] md:-left-10" size="lg" tone="dark" />

      <div className="relative z-10 flex items-baseline justify-between gap-4">
        <span className="t-meta text-gold-soft">
          {String(index + 1).padStart(2, "0")}
        </span>
        <CountLine count={items.length} tone="dark" />
      </div>

      <div className="relative z-10 mt-8 md:mt-10">
        <h3 className="t-title text-ivory">{category.name}</h3>
        <p className="mt-2.5 max-w-[26ch] text-sm leading-relaxed text-ivory/65">
          {category.tagline}
        </p>
      </div>

      {/* The range itself, set like a packing list. */}
      <ul className="relative z-10 mt-8 max-w-[21rem] md:mt-10">
        {items.map((item) => (
          <li
            key={item.slug}
            className="flex items-baseline justify-between gap-4 border-t border-ivory/15 py-2.5"
          >
            <span className="text-sm text-ivory/85">{item.name}</span>
            <span className="t-meta shrink-0 text-ivory/45">
              {item.packSizes[0] ?? "—"}
            </span>
          </li>
        ))}
      </ul>

      <span className="t-meta relative z-10 mt-auto inline-flex items-center gap-2 pt-8 text-gold-soft transition-transform duration-300 group-hover:translate-x-1">
        Explore <span aria-hidden="true">→</span>
      </span>

      {category.image ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[8%] -right-[12%] w-[40%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105 md:-right-[8%] md:w-[36%]"
        >
          <Image
            src={category.image}
            alt=""
            width={1000}
            height={1000}
            sizes="(max-width: 768px) 45vw, 26vw"
            className="h-auto w-full drop-shadow-[0_18px_36px_rgba(0,0,0,0.35)]"
          />
        </div>
      ) : null}
    </Link>
  );
}

function StandardPanel({ category, index, items }: PanelProps) {
  return (
    <Link
      href={`/products/${category.slug}`}
      data-cursor-label="VIEW"
      className="group relative flex h-full min-h-[17rem] flex-col justify-between overflow-hidden border border-sand bg-paper p-8 transition-colors duration-500 hover:border-forest/30 md:p-10"
    >
      <div className="relative z-10 flex items-baseline justify-between gap-4">
        <span className="t-meta text-gold">
          {String(index + 1).padStart(2, "0")}
        </span>
        <CountLine count={items.length} tone="light" />
      </div>

      {category.image ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[12%] -right-[6%] w-[42%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        >
          <Image
            src={category.image}
            alt=""
            width={1000}
            height={1000}
            sizes="(max-width: 768px) 45vw, 22vw"
            className="h-auto w-full drop-shadow-[0_18px_36px_rgba(19,48,31,0.26)]"
          />
        </div>
      ) : (
        /* No licensed photography for pulses — so the panel leans on the
           house mark instead of borrowing a stock image. */
        <NinetyOneMark className="-bottom-10 -right-3" size="md" tone="light" />
      )}

      <div className="relative z-10 mt-16 max-w-[24ch]">
        <h3 className="t-title text-forest">{category.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {category.tagline}
        </p>
        <span className="t-meta mt-6 inline-flex items-center gap-2 text-forest transition-transform duration-300 group-hover:translate-x-1">
          Explore <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export function PortfolioGrid() {
  return (
    <section aria-labelledby="portfolio-heading" className="section bg-ivory">
      <div className="shell">
        <SectionHeading
          index="03"
          label="Portfolio"
          id="portfolio-heading"
          lines={["Four categories,", "one standard."]}
          description="Rice is the core of the business; spices, pulses and sugar travel the same route and are held to the same handling."
          className="max-w-3xl"
        />

        <div className="mt-16 grid gap-4 md:grid-cols-12">
          {categories.map((category, index) => {
            const items = getProductsByCategory(category.slug);
            const isFeature = category.slug === "rice";

            return (
              <Reveal
                key={category.slug}
                delay={index * 0.06}
                className={spans[category.slug]}
              >
                {isFeature ? (
                  <FeaturePanel category={category} index={index} items={items} />
                ) : (
                  <StandardPanel category={category} index={index} items={items} />
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
