"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import {
  gsap,
  registerGsap,
  SCROLL_START,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  /** Wrapper element — keep the page's heading/semantic structure intact. */
  as?: ElementType;
  className?: string;
  /** Stagger direct children instead of animating the wrapper as one block. */
  stagger?: boolean;
  delay?: number;
  /** Distance in px the element rises from. */
  distance?: number;
}

/**
 * The "rise" verb of the motion system: 24px up, fade in, on scroll.
 * Elements are hidden by `.js-motion [data-reveal]` in CSS, so they are always
 * visible when JavaScript or motion is unavailable.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  stagger = false,
  delay = 0,
  distance = 24,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    registerGsap();

    const context = gsap.context(() => {
      const targets = stagger
        ? (Array.from(element.children) as HTMLElement[])
        : [element];

      // When staggering we animate the children, so the wrapper — which CSS
      // hides via [data-reveal] — has to be un-hidden explicitly. Without this
      // the whole block stays at opacity 0 and the section renders empty.
      if (stagger) gsap.set(element, { opacity: 1 });

      gsap.set(targets, { opacity: 0, y: distance });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay,
        stagger: stagger ? 0.06 : 0,
        clearProps: "willChange",
        scrollTrigger: { trigger: element, start: SCROLL_START, once: true },
      });
    }, element);

    return () => context.revert();
  }, [stagger, delay, distance]);

  return (
    <Tag ref={ref} data-reveal className={className}>
      {children}
    </Tag>
  );
}
