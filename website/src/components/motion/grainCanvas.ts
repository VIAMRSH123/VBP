"use client";

/** Canvas plumbing and shape builders for the About page's grain morph. */

export const GRAIN_PALETTE = {
  forest: "#13301f",
  gold: "#8c6529",
} as const;

export type Stage = { ctx: CanvasRenderingContext2D; w: number; h: number };
export type Point = [number, number];

/** DPR-aware canvas sizing that re-fits on resize. */
export function mountCanvas(canvas: HTMLCanvasElement): {
  stage: Stage;
  destroy: () => void;
} {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const stage: Stage = { ctx, w: 0, h: 0 };

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    stage.w = rect.width;
    stage.h = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(canvas);

  return { stage, destroy: () => observer.disconnect() };
}

/** Deterministic pseudo-random, so every visitor sees the same composition. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  long: number,
  short: number,
  fill: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, long, short, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Samples filled pixels of rendered text so grain can take a glyph's shape. */
export function sampleText(
  text: string,
  font: string,
  count: number,
  rng: () => number,
): Point[] {
  const size = 360;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d");
  if (!ctx) return [];

  ctx.fillStyle = "#000";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);

  const { data } = ctx.getImageData(0, 0, size, size);
  const filled: Point[] = [];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4 + 3] > 128) filled.push([x / size, y / size]);
    }
  }
  if (filled.length === 0) return [];

  return Array.from({ length: count }, () => {
    const p = filled[Math.floor(rng() * filled.length)];
    return [p[0], p[1]] as Point;
  });
}

/** Rejection-samples points inside a predicate, in 0..1 space. */
export function fillShape(
  count: number,
  rng: () => number,
  inside: (x: number, y: number) => boolean,
): Point[] {
  const points: Point[] = [];
  let guard = 0;
  while (points.length < count && guard < count * 400) {
    guard += 1;
    const x = rng();
    const y = rng();
    if (inside(x, y)) points.push([x, y]);
  }
  while (points.length < count) points.push([rng(), rng()]);
  return points;
}
