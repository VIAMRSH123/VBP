"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  gsap,
  registerGsap,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

const stages = [
  {
    step: "01",
    title: "Source",
    body: "Rice is bought where it is grown — the Telangana belt for sona masoori, the northern basmati districts for 1121.",
  },
  {
    step: "02",
    title: "Select",
    body: "Grain is sortex-graded before it is bagged. The Satake marks on the Telangana Gold and 911 packs are the record of that step.",
  },
  {
    step: "03",
    title: "Package",
    body: "Packed into 18, 20 and 35 kg trade packs and 1 kg spice pouches, labelled in English, Arabic and Telugu for Gulf retail.",
  },
  {
    step: "04",
    title: "Distribute",
    body: "Landed and held in Doha's Industrial Area, then out to wholesalers, supermarkets, hotels and catering kitchens.",
  },
] as const;

/**
 * Abstract network diagram, not a map. It shows the company's own stated
 * reach — India, Africa, Dubai, Qatar — and nothing more: no invented ports,
 * routes, suppliers or warehouses.
 */
type JourneyNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  origin?: boolean;
};

const nodes: readonly JourneyNode[] = [
  { id: "india", label: "India", x: 300, y: 190, origin: true },
  { id: "qatar", label: "Qatar", x: 880, y: 120 },
  { id: "dubai", label: "Dubai", x: 800, y: 250 },
  { id: "africa", label: "Africa", x: 620, y: 330 },
];

export function SupplyJourney() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    registerGsap();

    const context = gsap.context(() => {
      const arcs = gsap.utils.toArray<SVGPathElement>("[data-arc]");

      arcs.forEach((arc) => {
        const length = arc.getTotalLength();
        gsap.set(arc, { strokeDasharray: length, strokeDashoffset: length });
      });

      gsap.to(arcs, {
        strokeDashoffset: 0,
        ease: "none",
        stagger: 0.12,
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          end: "center center",
          scrub: 0.8,
        },
      });

      gsap.from("[data-node]", {
        scale: 0,
        opacity: 0,
        transformOrigin: "center",
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: { trigger: section, start: "top 65%", once: true },
      });
    }, section);

    return () => context.revert();
  }, []);

  const origin = nodes[0];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="journey-heading"
      className="dark-section section relative overflow-hidden"
      id="sourcing"
    >
      <div className="shell">
        <SectionHeading
          index="06"
          label="Sourcing & distribution"
          id="journey-heading"
          lines={["From the field", "to the order."]}
          description="Four steps, each of which someone at TFS is accountable for. The diagram below is an abstract of the company's stated reach, not a route map."
          className="max-w-3xl"
        />

        <Reveal delay={0.1} className="mt-14">
          <svg
            viewBox="0 0 1200 420"
            role="img"
            aria-label="Abstract diagram: sourcing in India reaching Qatar, Dubai and Africa"
            className="h-auto w-full"
          >
            <defs>
              <linearGradient id="arcFade" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--color-gold-soft)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--color-gold-soft)" stopOpacity="0.9" />
              </linearGradient>
              <pattern
                id="dotGrid"
                width="26"
                height="26"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.14" />
              </pattern>
            </defs>

            <rect width="1200" height="420" fill="url(#dotGrid)" className="text-ivory" />

            {nodes.slice(1).map((node) => {
              const midX = (origin.x + node.x) / 2;
              const midY = Math.min(origin.y, node.y) - 90;
              return (
                <path
                  key={node.id}
                  data-arc
                  d={`M ${origin.x} ${origin.y} Q ${midX} ${midY} ${node.x} ${node.y}`}
                  fill="none"
                  stroke="url(#arcFade)"
                  strokeWidth="1.5"
                />
              );
            })}

            {nodes.map((node) => (
              <g key={node.id} data-node>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.origin ? 9 : 5}
                  fill={node.origin ? "var(--color-gold-soft)" : "var(--color-ivory)"}
                />
                {node.origin ? (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    fill="none"
                    stroke="var(--color-gold-soft)"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                  />
                ) : null}
                <text
                  x={node.x}
                  y={node.y - (node.origin ? 34 : 18)}
                  textAnchor="middle"
                  className="t-meta"
                  fill="var(--color-ivory)"
                  fontSize="13"
                  letterSpacing="2"
                >
                  {node.label.toUpperCase()}
                </text>
              </g>
            ))}
          </svg>
        </Reveal>

        {/* The brand's own watercolour vignettes — ploughing, harvest, cart,
            delivery — lifted onto a paper panel over the dark section. */}
        <Reveal delay={0.08} className="mt-16 bg-ivory p-6 md:mt-20 md:p-10">
          <Image
            src="/journey/farm-vignettes.jpg"
            alt="Illustrated sequence: ploughing, harvesting, carting and delivering the crop"
            width={1663}
            height={417}
            sizes="(max-width: 768px) 92vw, 80vw"
            className="h-auto w-full"
          />

          <ol className="mt-8 grid gap-8 md:grid-cols-4 md:gap-6">
            {stages.map((stage) => (
              <li key={stage.step} className="hairline border-sand pt-4">
                <span className="t-index t-meta text-gold">{stage.step}</span>
                <h3 className="t-title mt-2 text-[1.35rem] text-forest">
                  {stage.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-charcoal/70">
                  {stage.body}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
