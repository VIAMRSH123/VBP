import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getProductsByCategory } from "@/content/products";

const spices = getProductsByCategory("spices");

/** Offsets break the row so it never reads as three identical cards. */
const offsets = ["md:mt-0", "md:mt-16", "md:mt-6"];

export function SpiceBand() {
  return (
    <section
      aria-labelledby="spices-heading"
      className="grain section relative overflow-hidden bg-[color-mix(in_oklab,var(--color-gold-soft)_14%,var(--color-ivory))]"
      id="spices"
    >
      <div className="shell">
        <div className="grid gap-10 md:grid-cols-12">
          <SectionHeading
            index="05"
            label="Spices"
            id="spices-heading"
            lines={["Ground, packed", "and sealed at", "a kilogram."]}
            className="md:col-span-5"
          />
          <Reveal delay={0.1} className="md:col-span-5 md:col-start-8 md:self-end">
            <p className="t-lead text-charcoal/75">
              Turmeric, coriander and chilli under the 91 Telangana Gold label —
              the three a South Indian kitchen reaches for every service. Packed
              at a kilogram, with no preservatives on the label.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3 md:mt-20 md:gap-5">
          {spices.map((spice, index) => (
            <Reveal
              key={spice.slug}
              delay={index * 0.08}
              className={offsets[index % offsets.length]}
            >
              <Link
                href={`/products/spices/${spice.slug}`}
                data-cursor-label="VIEW PRODUCT"
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                  {spice.image ? (
                    <Image
                      src={spice.image}
                      alt={spice.imageAlt}
                      width={1000}
                      height={1000}
                      sizes="(max-width: 640px) 90vw, 30vw"
                      className="h-full w-full object-contain p-8 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                    />
                  ) : null}
                </div>
                <div className="hairline mt-5 flex items-baseline justify-between gap-3 pt-4">
                  <h3 className="t-title text-[1.4rem] text-forest">
                    {spice.name}
                  </h3>
                  <span className="t-meta shrink-0 text-gold">
                    {spice.packSizes[0]}
                  </span>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">
                  {spice.summary}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
