"use client";

import { useEffect, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** One registration for the whole app; calling it twice is harmless. */
let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "expo.out", duration: 0.9 });
  registered = true;
}

/** useLayoutEffect warns during SSR; fall back to useEffect on the server. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Read once, synchronously, inside the layout effect that sets an animation
 * up. GSAP work happens outside React's render, so there is nothing to put in
 * state — and CSS already handles the case where someone flips the OS setting
 * mid-session, via the `prefers-reduced-motion` block in globals.css.
 */
export function reducedMotionNow(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** True for devices without a precise pointer: no custom cursor, no magnets. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export const SCROLL_START = "top 82%";

export { gsap, ScrollTrigger };
