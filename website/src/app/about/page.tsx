import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { GrainMorph } from "@/components/motion/GrainMorph";
import { FlagStorm } from "@/components/motion/FlagStorm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { company } from "@/content/company";

export const metadata: Metadata = {
  title: "About — A Doha food trading house",
  description:
    "Suncons Trading & Contracting W.L.L. supplies Indian rice, spices, pulses and sugar from Doha's Industrial Area to Qatar's retail, industrial and food-service trade.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        lines={["Grain is", "a promise", "kept twice."]}
        description="Once when it is bought in India, and again when it lands in Doha and has to be exactly what the buyer was told it would be."
        crumbs={[{ href: "/", label: "Home" }]}
        aside={<FlagStorm />}
      />

      <section aria-labelledby="story-heading" className="section bg-ivory pt-0">
        <div className="shell grid gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <SectionHeading
              index="01"
              label="The company"
              id="story-heading"
              lines={["From the", "rice belt to", "the Gulf."]}
            />

            {/* The sentence, drawn in the product itself. */}
            <div className="mt-10 md:mt-14">
              <GrainMorph />
            </div>
          </div>

          <div className="t-lead text-charcoal/75 md:col-span-6 md:col-start-7">
            {/* space-y has to sit on the Reveal: it is the element whose
                children are the paragraphs. */}
            <Reveal stagger className="space-y-6">
              <p>
                TF Suncons was established to put basmati and non-basmati rice
                of a dependable grade in front of customers who cannot afford a
                surprise — without trading away flavour or nutritional value to
                get there.
              </p>
              <p>
                The people behind the business came to it from the growing,
                cultivation and production side of rice. That is an unglamorous
                advantage, and it shows up in the part customers actually feel:
                the pack opened in month six matches the sample from month one.
              </p>
              <p>
                Over the years the business has reached customers across several
                states in India, a handful of countries in Africa, and the Gulf
                — Dubai and Qatar. The processing techniques used control
                quality and hygiene, while the blend of fragrance and taste is
                what keeps the product moving across those markets.
              </p>
              <p>
                Today the operation runs out of Doha&rsquo;s Industrial Area,
                supplying rice, spices, pulses and sugar to the retail,
                industrial and food-service trade.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-label="Harvest and distribution" className="bg-paper">
        <div className="shell py-10 md:py-14">
          <ImageReveal
            src="/brand/about-banner.jpg"
            alt="Bharat Gate basmati beside an illustrated scene of a rice harvest"
            width={1663}
            height={400}
            sizes="100vw"
            className="w-full"
            imageClassName="h-auto w-full"
          />
        </div>
      </section>

      <section aria-labelledby="mission-heading" className="dark-section section">
        <div className="shell">
          <SectionHeading
            index="02"
            label="Mission & vision"
            id="mission-heading"
            lines={["What we are", "working toward."]}
            className="max-w-3xl"
          />

          <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
            <Reveal>
              <figure className="hairline pt-6">
                <figcaption className="t-meta text-gold-soft">
                  Our mission
                </figcaption>
                <blockquote className="t-title mt-5 max-w-[26ch] text-ivory">
                  <p>&ldquo;{company.mission}&rdquo;</p>
                </blockquote>
              </figure>
            </Reveal>
            <Reveal delay={0.08}>
              <figure className="hairline pt-6">
                <figcaption className="t-meta text-gold-soft">
                  Our vision
                </figcaption>
                <blockquote className="t-title mt-5 max-w-[26ch] text-ivory">
                  <p>&ldquo;{company.vision}&rdquo;</p>
                </blockquote>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="reach-heading" className="section bg-ivory">
        <div className="shell grid gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-6">
            <SectionHeading
              index="03"
              label="Reach & markets"
              id="reach-heading"
              lines={["Where the", "product goes."]}
              description="The company's own description of its reach — no countries, ports or routes have been added to it."
            />

            <Reveal stagger as="ul" className="mt-10 grid grid-cols-2 gap-5">
              {company.reach.map((place) => (
                <li key={place} className="hairline pt-4">
                  <span className="t-title text-[1.5rem] text-forest">
                    {place}
                  </span>
                </li>
              ))}
            </Reveal>
          </div>

          <div className="md:col-span-5 md:col-start-8">
            <Reveal>
              <Image
                src="/brand/rice-sacks.png"
                alt="Jute bags of milled rice beside paddy stalks"
                width={379}
                height={369}
                sizes="(max-width: 768px) 80vw, 32vw"
                className="h-auto w-full max-w-sm"
              />
            </Reveal>

            <Reveal delay={0.08} as="dl" stagger className="mt-10 space-y-7">
              <div className="hairline pt-4">
                <dt className="t-meta text-muted">Markets served</dt>
                <dd className="mt-3">
                  <ul className="space-y-1.5 text-charcoal/80">
                    {company.markets.map((market) => (
                      <li key={market}>{market}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className="hairline pt-4">
                <dt className="t-meta text-muted">Quality assurance</dt>
                <dd className="mt-3 text-charcoal/80">
                  {company.qualityStatement}
                </dd>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section bg-paper">
        <div className="shell grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 className="t-display text-forest">
              Work with us on your next order.
            </h2>
            <p className="t-lead mt-5 max-w-[48ch] text-charcoal/75">
              Wholesale, retail, hospitality or catering — tell us what you buy
              and how often.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MagneticButton href="/contact#enquiry" cursorLabel="ENQUIRE">
              Start a trade enquiry
            </MagneticButton>
          </div>
        </div>
      </section>
    </>
  );
}
