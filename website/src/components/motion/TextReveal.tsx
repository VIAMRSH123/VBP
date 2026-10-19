"use client";

import { useRef, type ElementType } from "react";
import {
  gsap,
  registerGsap,
  SCROLL_START,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

type TextRevealProps = {
  /** Each entry is one masked line. Copy is authored as lines deliberately. */
  lines: readonly string[];
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Play immediately rather than on scroll — used by the hero. */
  immediate?: boolean;
  id?: string;
};

/**
 * The "unmask" verb: each line slides up from behind its own mask.
 * The lines are real text in the DOM at all times, so the heading stays
 * selectable, searchable and readable to assistive technology.
 */
export function TextReveal({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
  immediate = false,
  id,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    registerGsap();

    const context = gsap.context(() => {
      const inner = element.querySelectorAll<HTMLElement>("[data-line-inner]");

      // `y: 0` is load-bearing. The CSS pre-hide uses translateY(105%), which
      // GSAP reads back as a `y` offset in px; without resetting it, `yPercent`
      // stacks on top of it and the line never returns to the baseline.
      gsap.fromTo(
        inner,
        { yPercent: 105, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: 1.05,
          delay,
          stagger: 0.09,
          ease: "expo.out",
          ...(immediate
            ? {}
            : {
                scrollTrigger: {
                  trigger: element,
                  start: SCROLL_START,
                  once: true,
                },
              }),
        },
      );
    }, element);

    return () => context.revert();
  }, [delay, immediate, lines]);

  return (
    <Tag ref={ref} id={id} className={className} data-reveal-line>
      {lines.map((line) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <span data-line-inner className="block">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
