import Link from "next/link";
import { TradeBoard } from "@/components/motion/TradeBoard";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { company } from "@/content/company";

export function CompanyIntro() {
  // pb-0: the next section is the same ivory, so two full section paddings
  // would stack into one 200px+ void with nothing to mark the break.
  return (
    <section
      aria-labelledby="intro-heading"
      className="section bg-ivory pb-0"
      id="company"
    >
      <div className="shell grid gap-14 md:grid-cols-12 md:gap-10">
        <div className="flex flex-col md:col-span-5">
          <SectionHeading
            index="02"
            label="The business"
            id="intro-heading"
            lines={["More than", "moving product."]}
          />

          <Reveal delay={0.08}>
            <div className="t-lead mt-8 space-y-5 text-charcoal/75">
              <p>
                TF Suncons was built to put basmati and non-basmati rice of a
                dependable grade in front of Qatari buyers — without trading
                away flavour or nutritional value to get the price down.
              </p>
              <p>
                The people behind it come from the growing, cultivation and
                production side of rice, not from broking. That shows up in the
                part of the job customers actually feel: consistency from one
                container to the next.
              </p>
              <p>
                From a base in Doha&rsquo;s Industrial Area, the range now runs
                across rice, spices, pulses and sugar, serving the retail,
                industrial and food-service trade.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="mt-10 md:mt-auto md:pt-12">
            <Link
              href="/about"
              data-cursor-label="READ"
              className="t-meta link-underline text-forest"
            >
              Read the company story →
            </Link>
          </Reveal>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          {/* The packs are the products page's job; here the range is stated
              the way the trade states it — grade and weight on a freight
              board. */}
          <TradeBoard />

          <Reveal stagger as="dl" className="mt-10 grid gap-8 sm:grid-cols-2">
            <div className="hairline pt-5">
              <dt className="t-meta text-muted">Our mission</dt>
              <dd className="mt-3 text-charcoal/80">{company.mission}</dd>
            </div>
            <div className="hairline pt-5">
              <dt className="t-meta text-muted">Markets served</dt>
              <dd className="mt-3">
                <ul className="space-y-1.5 text-charcoal/80">
                  {company.markets.map((market) => (
                    <li key={market}>{market}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
