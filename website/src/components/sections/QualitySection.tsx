import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { company } from "@/content/company";

/**
 * Credibility without invention. Every line here is either the company's own
 * published wording or something printed on a pack — no counters, no
 * certifications, no claimed statistics.
 */
const printed = [
  {
    label: "Sortex grading",
    value: "Satake, Japan",
    body: "The 100% sortex mark on the Telangana Gold and 911 packs is the optical sort that removes discoloured and broken grain.",
  },
  {
    label: "Stated origin",
    value: "Telangana · Korutla",
    body: "The flagship sona masoori names its district on the pack rather than hiding behind “Produce of India”.",
  },
  {
    label: "Trade packing",
    value: "18 · 20 · 35 kg",
    body: "Pack weights sized for kitchens and wholesalers, with 1 kg pouches for the ground spices.",
  },
  {
    label: "Labelling",
    value: "English · Arabic · Telugu",
    body: "Trilingual packs, Gulf-ready, with the vegetarian mark and net weight declared in both scripts.",
  },
] as const;

export function QualitySection() {
  return (
    <section
      aria-labelledby="quality-heading"
      className="section bg-paper"
      id="quality"
    >
      <div className="shell">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Reveal className="hairline flex items-baseline gap-4 pt-4">
              <span className="t-index t-meta text-gold">07</span>
              <span className="t-meta text-muted">Quality</span>
            </Reveal>
            <TextReveal
              as="h2"
              id="quality-heading"
              lines={["What the", "pack already", "tells you."]}
              className="t-display mt-7 text-forest"
            />
          </div>

          <figure className="md:col-span-7 md:col-start-6 md:self-center">
            <Reveal>
              <blockquote className="t-title max-w-[26ch] text-charcoal">
                <p>&ldquo;{company.qualityStatement}&rdquo;</p>
              </blockquote>
              <figcaption className="t-meta mt-6 text-muted">
                — {company.tradingName}, on its own quality assurance
              </figcaption>
            </Reveal>
          </figure>
        </div>

        <Reveal stagger as="dl" className="mt-20 grid gap-10 md:grid-cols-4 md:gap-6">
          {printed.map((item) => (
            <div key={item.label} className="hairline pt-5">
              <dt className="t-meta text-muted">{item.label}</dt>
              <dd>
                <p className="t-title mt-3 text-[1.35rem] text-forest">
                  {item.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal/70">
                  {item.body}
                </p>
              </dd>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
