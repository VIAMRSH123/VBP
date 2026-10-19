"use client";

import { useRef } from "react";
import {
  gsap,
  isTouchDevice,
  reducedMotionNow,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * Dot + ring cursor with contextual labels.
 *
 * Rules it obeys, deliberately:
 *  · never rendered on touch devices or under prefers-reduced-motion
 *  · `pointer-events: none` throughout, so links, buttons, text selection and
 *    form controls behave exactly as they would without it
 *  · the real cursor is only hidden once this one is actually running
 *  · driven by gsap.quickTo on refs — no React state per pointer move
 *
 * Opt an element in with `data-cursor-label="VIEW"` or `data-cursor="hover"`.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;
    if (isTouchDevice() || reducedMotionNow()) return;

    document.documentElement.classList.add("has-custom-cursor");
    gsap.set([dot, ring], { opacity: 0, xPercent: -50, yPercent: -50 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3.out" });

    let visible = false;

    const handleMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
      }
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
    };

    const handleLeave = () => {
      visible = false;
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    };

    const handleOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor-label], a, button, input, textarea, select, [role='button']",
      );

      const text = target?.dataset.cursorLabel;
      if (text) {
        label.textContent = text;
        gsap.to(ring, { scale: 2.6, borderWidth: 1, duration: 0.4 });
        gsap.to(label, { opacity: 1, duration: 0.3 });
        return;
      }

      gsap.to(ring, { scale: target ? 1.7 : 1, duration: 0.4 });
      gsap.to(label, { opacity: 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerover", handleOver, { passive: true });
    document.addEventListener("pointerleave", handleLeave);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerover", handleOver);
      document.removeEventListener("pointerleave", handleLeave);
      document.documentElement.classList.remove("has-custom-cursor");
      gsap.killTweensOf([dot, ring, label]);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border border-forest/40 opacity-0 mix-blend-multiply"
      >
        <span
          ref={labelRef}
          className="t-meta absolute inset-0 flex scale-[0.4] items-center justify-center text-[8px] tracking-[0.1em] text-forest opacity-0"
        />
      </div>
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-forest opacity-0"
      />
    </div>
  );
}
