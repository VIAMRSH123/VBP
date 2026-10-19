"use client";

import { useRef } from "react";
import {
  gsap,
  registerGsap,
  reducedMotionNow,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";
import {
  GRAIN_PALETTE,
  clamp01,
  drawGrain,
  easeInOut,
  lerp,
  mountCanvas,
  seeded,
} from "./grainCanvas";
import { STATE_LABELS, buildStates } from "./grainStates";

const COUNT = 1500;
/** Enough gold to build the wheat wreath in the final state. */
const GOLD_RATIO = 0.2;

/**
 * The company's sentence, drawn in its own product: a field of rice grain that
 * re-forms as you scroll — paddy rows, an ocean swell, the Doha skyline, and
 * finally the 91 mark the whole range is sold under.
 *
 * Each grain keeps its identity across all four states and is released on its
 * own delay, so the field ripples into shape rather than snapping. The loop is
 * suspended whenever the panel is off screen, and reduced motion gets the
 * final state rendered once, with no animation at all.
 */
export function GrainMorph() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    registerGsap();

    const rng = seeded(20261019);
    const golds = Array.from({ length: COUNT }, () => rng() < GOLD_RATIO);
    const states = buildStates(COUNT, golds, rng);
    const offsets = Array.from({ length: COUNT }, () => rng() * 0.42);
    const sizes = Array.from({ length: COUNT }, () => 0.72 + rng() * 0.58);

    const { stage, destroy } = mountCanvas(canvas);
    let raf = 0;
    let running = false;
    let lastLabel = -1;

    const paint = () => {
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);

      // Map through a centred square so circles stay circular.
      const size = Math.min(w, h);
      const ox = (w - size) / 2;
      const oy = (h - size) / 2;

      const span = states.length - 1;
      const scaled = clamp01(progress.current) * span;
      const index = Math.min(Math.floor(scaled), span - 1);
      const local = scaled - index;
      const from = states[index];
      const to = states[index + 1];

      for (let i = 0; i < COUNT; i += 1) {
        const offset = offsets[i];
        const t = easeInOut(clamp01((local - offset) / (1 - offset)));
        const px = lerp(from[i][0], to[i][0], t);
        const py = lerp(from[i][1], to[i][1], t);
        const dx = to[i][0] - from[i][0];
        const dy = to[i][1] - from[i][1];
        const moving = t > 0.03 && t < 0.97;
        const scale = sizes[i];

        drawGrain(
          ctx,
          ox + px * size,
          oy + py * size,
          moving ? Math.atan2(dy, dx) : -0.32,
          2.45 * scale,
          0.95 * scale,
          golds[i] ? GRAIN_PALETTE.gold : GRAIN_PALETTE.forest,
          golds[i] ? 0.85 : 0.58,
        );
      }

      const nearest = Math.round(clamp01(progress.current) * span);
      if (nearest !== lastLabel && labelRef.current) {
        lastLabel = nearest;
        labelRef.current.textContent = `${String(nearest + 1).padStart(2, "0")} · ${STATE_LABELS[nearest]}`;
      }
    };

    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };

    if (reducedMotionNow()) {
      progress.current = 1;
      paint();
      return () => destroy();
    }

    const context = gsap.context(() => {
      const proxy = { value: 0 };
      gsap.to(proxy, {
        value: 1,
        ease: "none",
        onUpdate: () => {
          progress.current = proxy.value;
        },
        scrollTrigger: {
          trigger: wrap,
          // The last state is the payoff, so the sequence has to finish while
          // the panel is still well inside the viewport — not as it leaves.
          start: "top 92%",
          end: "bottom 62%",
          scrub: 0.9,
        },
      });

      // Only burn frames while the panel is actually on screen.
      ScrollTrigger.create({
        trigger: wrap,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive && !running) {
            running = true;
            raf = requestAnimationFrame(loop);
          } else if (!self.isActive && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
      });
    }, wrap);

    paint();

    return () => {
      cancelAnimationFrame(raf);
      context.revert();
      destroy();
    };
  }, []);

  return (
    /* Capped so the square canvas doesn't become a 700px-tall block on a
       phone; on desktop the column is narrower than the cap anyway. */
    <figure ref={wrapRef} className="relative m-0 w-full max-w-[30rem]">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block aspect-square w-full"
      />
      <figcaption className="hairline mt-4 flex items-baseline justify-between gap-4 pt-3">
        <span ref={labelRef} className="t-meta text-gold">
          01 · In the field
        </span>
        <span className="t-meta text-muted">Telangana → Doha</span>
      </figcaption>
    </figure>
  );
}
