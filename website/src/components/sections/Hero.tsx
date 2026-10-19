"use client";

import Image from "next/image";
import { useRef } from "react";
import { TextReveal } from "@/components/motion/TextReveal";
import { MagneticButton } from "@/components/motion/MagneticButton";
import {
  gsap,
  isTouchDevice,
  reducedMotionNow,
  registerGsap,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";
import { company } from "@/content/company";

/** Back, mid, front — the depth order of the pack composition. */
const packs = [
  {
    src: "/products/golden-grand.png",
    alt: "Golden Grand Indian basmati rice pack",
    depth: 1,
    className:
      "absolute left-0 top-[12%] w-[46%] origin-bottom -rotate-6 opacity-90",
  },
  {
    src: "/products/91-telangana-gold.png",
    alt: "91 Telangana Gold sona masoori rice pack",
    depth: 2,
    className: "absolute right-0 top-[6%] w-[52%] origin-bottom rotate-6",
  },
  {
    src: "/products/bharat-gate.png",
    alt: "Bharat Gate 1121 premium basmati rice pack",
    depth: 3,
    className: "relative z-10 mx-auto w-[64%]",
  },
] as const;

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    registerGsap();

    const context = gsap.context(() => {
      const layers = gsap.utils.toArray<HTMLElement>("[data-pack]");

      // 1 · entrance — the composition settles while the headline unmasks.
      gsap.from(layers, {
        y: 60,
        opacity: 0,
        scale: 0.94,
        duration: 1.3,
        stagger: 0.12,
        delay: 0.25,
        ease: "expo.out",
      });

      gsap.from("[data-hero-fade]", {
        opacity: 0,
        y: 18,
        duration: 0.9,
        stagger: 0.08,
        delay: 0.55,
      });

      if (reducedMotionNow()) return;

      // 2 · idle — slow scroll parallax, each layer at its own rate.
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth ?? 1);
        gsap.to(layer, {
          yPercent: -6 * depth,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      // 3 · cursor drift — pointer only, refs only, no React state.
      if (isTouchDevice()) return;

      const drifts = layers.map((layer) => ({
        x: gsap.quickTo(layer, "x", { duration: 1.1, ease: "power3.out" }),
        y: gsap.quickTo(layer, "y", { duration: 1.1, ease: "power3.out" }),
        depth: Number(layer.dataset.depth ?? 1),
      }));

      const handleMove = (event: PointerEvent) => {
        const relX = event.clientX / window.innerWidth - 0.5;
        const relY = event.clientY / window.innerHeight - 0.5;
        drifts.forEach((drift) => {
          drift.x(relX * drift.depth * 14);
          drift.y(relY * drift.depth * 10);
        });
      };

      window.addEventListener("pointermove", handleMove, { passive: true });
      return () => window.removeEventListener("pointermove", handleMove);
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="grain relative overflow-hidden bg-ivory pt-[72px]"
    >
      <div className="shell grid min-h-[88svh] items-center gap-12 py-14 md:grid-cols-12 md:gap-8 md:py-20">
        <div className="md:col-span-7 lg:col-span-6">
          <p data-hero-fade className="t-meta text-gold">
            {company.legalName} · Doha
          </p>

          <TextReveal
            as="h1"
            id="hero-heading"
            immediate
            delay={0.15}
            lines={["Quality that", "travels well."]}
            className="t-hero mt-6 text-forest"
          />

          <p
            data-hero-fade
            className="t-lead mt-8 max-w-[46ch] text-charcoal/75"
          >
            Basmati, sona masoori, ground spices and pulses — sourced in India,
            packed for the trade in 18, 20 and 35&nbsp;kg, and supplied to
            Qatar&rsquo;s wholesalers, supermarkets, hotels and caterers.
          </p>

          <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton href="/products" cursorLabel="VIEW">
              View the portfolio
            </MagneticButton>
            <MagneticButton
              href="/contact#enquiry"
              variant="outline"
              cursorLabel="ENQUIRE"
              className="text-forest"
            >
              Start a trade enquiry
            </MagneticButton>
          </div>
        </div>

        <div className="md:col-span-5 lg:col-span-6">
          <div className="relative mx-auto flex aspect-[5/4] w-full max-w-[640px] items-end justify-center">
            {/* Stage: a soft pool of light the packs stand on. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-[8%] bottom-[6%] h-[62%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-forest)_16%,transparent)_0%,transparent_68%)]"
            />
            {packs.map((pack) => (
              <div
                key={pack.src}
                data-pack
                data-depth={pack.depth}
                className={pack.className}
              >
                <Image
                  src={pack.src}
                  alt={pack.alt}
                  width={1000}
                  height={1000}
                  priority={pack.depth === 3}
                  sizes="(max-width: 768px) 60vw, 34vw"
                  className="h-auto w-full drop-shadow-[0_28px_48px_rgba(19,48,31,0.22)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shell">
        <div className="hairline flex items-center justify-between py-5">
          <span className="t-meta text-muted">Scroll</span>
          <span
            aria-hidden="true"
            className="h-10 w-px animate-[heroCue_2.4s_var(--ease-in-out-soft)_infinite] bg-gradient-to-b from-gold to-transparent"
          />
          <span className="t-meta text-muted">Industrial Area, Doha</span>
        </div>
      </div>
    </section>
  );
}
