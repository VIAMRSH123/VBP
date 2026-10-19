"use client";

import { useRef } from "react";
import {
  gsap,
  registerGsap,
  reducedMotionNow,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/** The characters a flap cycles through before it lands. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·";

/**
 * The range stated the way the trade states it — grade and weight, no brand
 * names. Every line is checked against the catalogue in content/products.ts:
 * sona masoori ships at 18 kg, 1121 basmati at 20 kg, long grain at 35 kg,
 * ground spice at 1 kg, and every pack is labelled in three scripts.
 */
const ROWS = [
  { left: "SONA MASOORI", right: "18 KG" },
  { left: "BASMATI 1121", right: "20 KG" },
  { left: "LONG GRAIN", right: "35 KG" },
  { left: "GROUND SPICE", right: "01 KG" },
  { left: "EN · AR · TE", right: "PACKED" },
] as const;

const LEFT_WIDTH = 14;
const RIGHT_WIDTH = 6;

/**
 * A split-flap freight board. Each cell spins through glyphs and lands on its
 * character, staggered across the board so it ripples left to right — the
 * register of shipping and arrivals rather than retail.
 *
 * Under reduced motion every cell is simply set to its final character.
 */
export function TradeBoard() {
  const rootRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    registerGsap();

    const context = gsap.context(() => {
      const cells = gsap.utils.toArray<HTMLElement>("[data-cell]");

      if (reducedMotionNow()) {
        cells.forEach((cell) => {
          cell.textContent = cell.dataset.target ?? "";
        });
        return;
      }

      const run = () => {
        cells.forEach((cell, index) => {
          const target = cell.dataset.target ?? "";
          const state = { step: 0 };
          const spins = 7 + (index % 5) * 2;

          gsap.to(state, {
            step: spins,
            duration: 0.5 + (index % 7) * 0.09,
            ease: "power2.out",
            delay: index * 0.012,
            onUpdate: () => {
              const i = Math.floor(state.step);
              cell.textContent =
                i >= spins - 1 ? target : GLYPHS[(i * 7 + index) % GLYPHS.length];
            },
            onComplete: () => {
              cell.textContent = target;
            },
          });
        });
      };

      ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        onEnter: run,
        onEnterBack: run,
      });

      // ScrollTrigger only fires on a crossing, so a board that is already in
      // view on load (deep link, reload mid-page) would sit blank forever.
      if (root.getBoundingClientRect().top < window.innerHeight * 0.8) run();
    }, root);

    return () => context.revert();
  }, []);

  const renderCells = (text: string, width: number, padStart: boolean) => {
    const padded = padStart
      ? text.padStart(width, " ")
      : text.padEnd(width, " ").slice(0, width);

    return padded.split("").map((char, i) => (
      <span
        key={`${text}-${padStart ? "r" : "l"}-${i}`}
        data-cell
        data-target={char}
        className={`inline-flex h-7 w-[15px] items-center justify-center bg-[color-mix(in_oklab,var(--color-charcoal)_9%,transparent)] font-mono text-[12px] ${
          padStart ? "text-gold" : "text-charcoal"
        }`}
      >
        {" "}
      </span>
    ));
  };

  return (
    <div
      ref={rootRef}
      className="bg-[color-mix(in_oklab,var(--color-sand)_55%,var(--color-ivory))] p-7 md:p-9"
    >
      <p className="t-meta text-muted">The range, in trade terms</p>

      <div className="mt-6 space-y-2.5">
        {ROWS.map((row) => (
          <div
            key={row.left}
            className="flex items-center justify-between gap-4"
          >
            <span aria-hidden="true" className="flex gap-[2px]">
              {renderCells(row.left, LEFT_WIDTH, false)}
            </span>
            <span aria-hidden="true" className="flex shrink-0 gap-[2px]">
              {renderCells(row.right, RIGHT_WIDTH, true)}
            </span>
            {/* The flaps are a visual device; this is what is actually read. */}
            <span className="sr-only">
              {row.left} — {row.right}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
