"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  gsap,
  registerGsap,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getFeaturedRice } from "@/content/products";

const rice = getFeaturedRice();

/**
 * The rice portfolio as a horizontal journey on desktop, a vertical stack on
 * mobile. Horizontal scroll is used here because the range *is* a sequence —
 * seven packs lined up the way they would be on a pallet.
 *
 * Accessibility: the track is a real scroll container, so keyboard and
 * trackpad users can move it directly; focusing a card that is off-screen
 * drives the page scroll to the matching point in the pinned timeline.
 */
export function RiceIndex() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    registerGsap();

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        {
          isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          if (!ctx.conditions?.isDesktop) return;

          const distance = () => track.scrollWidth - window.innerWidth;

          const tween = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // Keyboard: pull the page to the point where a focused card is visible.
          const handleFocusIn = (event: FocusEvent) => {
            const card = (event.target as HTMLElement).closest<HTMLElement>(
              "[data-rice-card]",
            );
            const trigger = tween.scrollTrigger;
            if (!card || !trigger) return;

            const index = Number(card.dataset.index ?? 0);
            const progress = rice.length > 1 ? index / (rice.length - 1) : 0;
            const target =
              trigger.start + (trigger.end - trigger.start) * progress;
            window.scrollTo({ top: target, behavior: "instant" });
          };

          track.addEventListener("focusin", handleFocusIn);
          return () => track.removeEventListener("focusin", handleFocusIn);
        },
      );

      return () => media.revert();
    }, section);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      context.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="rice-heading"
      className="dark-section relative overflow-hidden"
      id="rice"
    >
      <div className="shell pt-[var(--space-section)]">
        <SectionHeading
          index="04"
          label="Rice portfolio"
          id="rice-heading"
          lines={["Seven packs,", "seven jobs."]}
          description="Each variety exists for a different kitchen — a 1121 basmati for the banquet, a sona masoori for the staff canteen, a sortex-cleaned long grain for everyday service."
          className="max-w-3xl"
        />
      </div>

      <div
        ref={trackRef}
        className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--space-gutter)] pb-[var(--space-section)] md:mt-20 md:overflow-visible md:pb-0 md:pt-4 [&::-webkit-scrollbar]:hidden"
      >
        {rice.map((product, index) => (
          <article
            key={product.slug}
            data-rice-card
            data-index={index}
            className="group w-[78vw] shrink-0 snap-start sm:w-[58vw] md:w-[26rem] md:pb-[var(--space-section)]"
          >
            <Link
              href={`/products/rice/${product.slug}`}
              data-cursor-label="VIEW PRODUCT"
              className="flex h-full flex-col"
            >
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-forest-deep/50 p-10">
                <span className="t-index t-meta absolute left-5 top-5 text-gold-soft">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.imageAlt}
                    width={1000}
                    height={1000}
                    sizes="(max-width: 768px) 78vw, 26rem"
                    className="h-full w-auto object-contain transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                  />
                ) : null}
              </div>

              <div className="hairline mt-6 flex items-baseline justify-between gap-4 pt-4">
                <h3 className="t-title text-ivory">{product.name}</h3>
                {product.packSizes.length > 0 ? (
                  <span className="t-meta shrink-0 text-gold-soft">
                    {product.packSizes.join(" · ")}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-ivory/60">
                {product.summary}
              </p>
            </Link>
          </article>
        ))}

        <div className="hidden w-[var(--space-gutter)] shrink-0 md:block" />
      </div>
    </section>
  );
}
