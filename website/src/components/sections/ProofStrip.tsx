import { Reveal } from "@/components/motion/Reveal";
import { NinetyOneMark } from "@/components/ui/NinetyOneMark";
import { company } from "@/content/company";

/**
 * Four things we can actually prove, each readable on a pack or published by
 * the company. No counters, no percentages, no invented metrics.
 */
export function ProofStrip() {
  return (
    <section
      aria-label="What we can show you"
      className="dark-section relative overflow-hidden"
    >
      <NinetyOneMark className="-right-6 -top-10 md:-right-4" size="lg" tone="dark" />
      <div className="shell relative py-14 md:py-20">
        <Reveal
          stagger
          as="dl"
          className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4"
        >
          {company.proof.map((item) => (
            <div key={item.label} className="hairline pt-5">
              <dt className="t-meta text-gold-soft">{item.label}</dt>
              <dd className="t-title mt-3 text-ivory">{item.value}</dd>
              <p className="mt-2 text-sm leading-relaxed text-ivory/55">
                {item.note}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
