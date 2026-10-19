"use client";

import { useRef } from "react";
import {
  gsap,
  registerGsap,
  reducedMotionNow,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

const INDIA = {
  saffron: "#ff9933",
  white: "#ffffff",
  green: "#138808",
  chakra: "#000080",
};
const QATAR = { maroon: "#8a1538", white: "#ffffff" };

type Particle = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Bezier control point — how far out of the flag this grain is thrown. */
  cx: number;
  cy: number;
  ar: number;
  ag: number;
  ab: number;
  br: number;
  bg: number;
  bb: number;
  delay: number;
  size: number;
};

/** Paints a flag at sampling resolution; the storm reads its pixels. */
function paintFlag(kind: "india" | "qatar", w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  if (kind === "india") {
    const band = h / 3;
    ctx.fillStyle = INDIA.saffron;
    ctx.fillRect(0, 0, w, band);
    ctx.fillStyle = INDIA.white;
    ctx.fillRect(0, band, w, band);
    ctx.fillStyle = INDIA.green;
    ctx.fillRect(0, band * 2, w, band);

    const cx = w / 2;
    const cy = h / 2;
    const r = band * 0.4;
    ctx.strokeStyle = INDIA.chakra;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.6, r * 0.06);
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = QATAR.white;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = QATAR.maroon;
    const hoist = w * 0.3;
    const tip = w * 0.44;
    const points = 9;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(hoist, 0);
    for (let i = 0; i < points; i += 1) {
      ctx.lineTo(tip, ((i + 0.5) / points) * h);
      ctx.lineTo(hoist, ((i + 1) / points) * h);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * Two flags, one field of grain.
 *
 * Every pixel of the Indian flag is a rice grain. On a loop the whole flag
 * tears itself apart into a storm — each grain thrown along its own arc,
 * changing colour in flight — and lands as the flag of Qatar, then comes back.
 * It is the business in one image: Indian grain becoming Qatari supply.
 *
 * Reduced motion gets the Indian flag, still.
 */
export function FlagStorm() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    registerGsap();

    const context = gsap.context(() => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const compact = window.innerWidth < 768;
      const cols = compact ? 48 : 66;
      const rows = Math.round(cols * 0.66);

      const indiaPixels = paintFlag("india", cols, rows);
      const qatarPixels = paintFlag("qatar", cols, rows);
      if (!indiaPixels || !qatarPixels) return;

      let particles: Particle[] = [];
      let width = 0;
      let height = 0;

      const build = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // The flag sits centred, with room around it for the storm.
        const flagW = width * 0.66;
        const flagH = flagW * (rows / cols);
        const ox = (width - flagW) / 2;
        const oy = (height - flagH) / 2;
        const stepX = flagW / cols;
        const stepY = flagH / rows;

        particles = [];
        for (let gy = 0; gy < rows; gy += 1) {
          for (let gx = 0; gx < cols; gx += 1) {
            const i = (gy * cols + gx) * 4;
            const x = ox + gx * stepX + stepX / 2;
            const y = oy + gy * stepY + stepY / 2;

            // Throw each grain outward from the centre, with a rightward
            // drift — the direction the product actually travels.
            const dx = x - width / 2;
            const dy = y - height / 2;
            const spread = 0.9 + Math.random() * 2.4;

            particles.push({
              ax: x,
              ay: y,
              bx: x,
              by: y,
              cx: width / 2 + dx * spread + width * 0.12,
              cy: height / 2 + dy * spread * 1.15 - height * 0.05,
              ar: indiaPixels[i],
              ag: indiaPixels[i + 1],
              ab: indiaPixels[i + 2],
              br: qatarPixels[i],
              bg: qatarPixels[i + 1],
              bb: qatarPixels[i + 2],
              delay: Math.random() * 0.46,
              size: 0.75 + Math.random() * 0.6,
            });
          }
        }
      };

      build();

      const grainW = (width * 0.66) / cols;
      const still = reducedMotionNow();

      const paint = (p: number) => {
        ctx.clearRect(0, 0, width, height);
        const long = Math.max(1.1, grainW * 0.62);
        const short = Math.max(0.55, grainW * 0.3);

        for (const particle of particles) {
          const raw = (p - particle.delay) / (1 - particle.delay);
          const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
          const ease = t * t * (3 - 2 * t);
          const inv = 1 - ease;

          // Quadratic bezier: flag → thrown out → flag.
          const x =
            inv * inv * particle.ax +
            2 * inv * ease * particle.cx +
            ease * ease * particle.bx;
          const y =
            inv * inv * particle.ay +
            2 * inv * ease * particle.cy +
            ease * ease * particle.by;

          const flight = Math.sin(Math.PI * ease);
          const r = Math.round(particle.ar + (particle.br - particle.ar) * ease);
          const g = Math.round(particle.ag + (particle.bg - particle.ag) * ease);
          const b = Math.round(particle.ab + (particle.bb - particle.ab) * ease);

          const scale = particle.size * (1 + flight * 0.5);
          const angle =
            Math.atan2(particle.cy - particle.ay, particle.cx - particle.ax) +
            flight * 2.4;

          ctx.globalAlpha = 1 - flight * 0.32;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.ellipse(x, y, long * scale, short * scale, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      };

      if (still) {
        paint(0);
        return;
      }

      const state = { p: 0 };
      let shown = -1;
      const setLabel = (index: number) => {
        if (index === shown || !labelRef.current) return;
        shown = index;
        labelRef.current.textContent = index === 0 ? "India" : "Qatar";
      };
      setLabel(0);

      const loop = gsap
        .timeline({ repeat: -1, paused: true })
        .to(state, {
          p: 1,
          duration: 3.2,
          ease: "sine.inOut",
          onUpdate: () => {
            paint(state.p);
            setLabel(state.p > 0.5 ? 1 : 0);
          },
          delay: 1.5,
        })
        .to(state, {
          p: 0,
          duration: 3.2,
          ease: "sine.inOut",
          onUpdate: () => {
            paint(state.p);
            setLabel(state.p > 0.5 ? 1 : 0);
          },
          delay: 1.8,
        });

      ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });

      paint(0);

      const onResize = () => {
        build();
        paint(state.p);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, root);

    return () => context.revert();
  }, []);

  return (
    <figure ref={rootRef} className="m-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="The flag of India scattering into rice grain and reforming as the flag of Qatar"
        className="block aspect-[4/3] w-full"
      />
      <figcaption className="hairline mt-3 flex items-baseline justify-between gap-4 pt-3">
        <span ref={labelRef} className="t-meta text-gold">
          India
        </span>
        <span className="t-meta text-muted">One grain, two flags</span>
      </figcaption>
    </figure>
  );
}
