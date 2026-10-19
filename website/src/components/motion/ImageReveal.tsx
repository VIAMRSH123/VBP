"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  gsap,
  registerGsap,
  SCROLL_START,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

type ImageRevealProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  /** Adds a slow vertical drift as the section passes the viewport. */
  parallax?: number;
};

/**
 * The "settle" verb: a clip-path wipe with the image scaling 1.06 → 1 behind
 * it, so the picture arrives rather than pops.
 */
export function ImageReveal({
  src,
  alt,
  width,
  height,
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  parallax = 0,
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    registerGsap();

    const context = gsap.context(() => {
      const picture = element.querySelector("img");

      gsap.set(element, { clipPath: "inset(0 0 100% 0)" });
      gsap
        .timeline({
          scrollTrigger: { trigger: element, start: SCROLL_START, once: true },
        })
        .to(element, {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.15,
          ease: "expo.out",
        })
        .fromTo(
          picture,
          { scale: 1.06 },
          { scale: 1, duration: 1.4, ease: "expo.out" },
          0,
        );

      if (parallax !== 0) {
        gsap.to(picture, {
          yPercent: parallax,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, element);

    return () => context.revert();
  }, [parallax]);

  return (
    <div ref={ref} data-reveal-mask className={className}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={imageClassName}
      />
    </div>
  );
}
