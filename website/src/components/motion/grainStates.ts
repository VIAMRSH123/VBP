"use client";

import { fillShape, sampleText, type Point } from "./grainCanvas";

/**
 * The four shapes the grain field takes, in a normalised 0..1 square.
 * Order is the story: the crop, the crossing, landfall, the mark it arrives
 * under. Every state returns exactly `count` points at matching indices, so a
 * grain keeps its identity across the whole sequence.
 */

export const STATE_LABELS = [
  "In the field",
  "The crossing",
  "Landfall",
  "The mark",
] as const;

/** 01 — paddy rows, the crop still standing. */
function paddyRows(count: number, rng: () => number): Point[] {
  const rows = 12;
  return Array.from({ length: count }, (_, i) => {
    const row = i % rows;
    const y = 0.2 + (row / (rows - 1)) * 0.62 + (rng() - 0.5) * 0.014;
    const x = 0.05 + rng() * 0.9;
    return [x, y] as Point;
  });
}

/** 02 — the crossing: a swell of open water. */
function swell(count: number, rng: () => number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const band = i % 4;
    const x = rng();
    const base = 0.3 + band * 0.12;
    const y =
      base +
      Math.sin(x * Math.PI * 2.3 + band * 1.15) * 0.075 +
      (rng() - 0.5) * 0.022;
    return [x, y] as Point;
  });
}

/**
 * 03 — landfall. A West Bay silhouette built from real tower profiles rather
 * than a row of boxes: a domed cylinder, a waisted hyperboloid, a tapering
 * spire with a mast. Plus a corniche line and the bay beneath it.
 */
const GROUND = 0.76;

type TowerKind = "step" | "dome" | "waist" | "taper" | "spire";
type Tower = { cx: number; w: number; h: number; kind: TowerKind };

const TOWERS: Tower[] = [
  { cx: 0.085, w: 0.042, h: 0.17, kind: "step" },
  { cx: 0.16, w: 0.028, h: 0.33, kind: "dome" },
  { cx: 0.232, w: 0.05, h: 0.13, kind: "step" },
  { cx: 0.318, w: 0.03, h: 0.46, kind: "waist" },
  { cx: 0.395, w: 0.038, h: 0.24, kind: "taper" },
  { cx: 0.482, w: 0.027, h: 0.58, kind: "spire" },
  { cx: 0.562, w: 0.046, h: 0.2, kind: "step" },
  { cx: 0.645, w: 0.031, h: 0.4, kind: "waist" },
  { cx: 0.722, w: 0.036, h: 0.27, kind: "dome" },
  { cx: 0.8, w: 0.026, h: 0.5, kind: "taper" },
  { cx: 0.873, w: 0.044, h: 0.16, kind: "step" },
];

/** Half-width of a tower at height fraction u (0 at ground, 1 at the top). */
function profile(kind: TowerKind, u: number, w: number): number {
  switch (kind) {
    case "step":
      return w * (u > 0.84 ? 0.68 : 1);
    case "dome":
      // Cylinder that rounds off into a cap.
      return u > 0.88 ? w * Math.sqrt(Math.max(0, 1 - ((u - 0.88) / 0.12) ** 2)) : w;
    case "waist":
      // Hyperboloid: wide at both ends, pinched in the middle.
      return w * (0.52 + 0.48 * Math.abs(2 * u - 1) ** 1.5);
    case "taper":
      return w * (1 - 0.42 * u);
    case "spire":
      return u < 0.84 ? w * (1 - 0.46 * u) : w * 0.1;
    default:
      return w;
  }
}

function skyline(count: number, rng: () => number): Point[] {
  const towerCount = Math.round(count * 0.74);
  const cornicheCount = Math.round(count * 0.08);
  const bayCount = count - towerCount - cornicheCount;

  const towers = fillShape(towerCount, rng, (x, y) => {
    if (y > GROUND || y < 0.1) return false;
    for (const t of TOWERS) {
      if (y < GROUND - t.h) continue;
      const u = (GROUND - y) / t.h;
      if (Math.abs(x - t.cx) <= profile(t.kind, u, t.w)) return true;
    }
    return false;
  });

  const corniche = Array.from({ length: cornicheCount }, () => {
    const x = 0.02 + rng() * 0.96;
    return [x, GROUND + 0.004 + rng() * 0.012] as Point;
  });

  // The bay: thinning out as it goes down, so it reads as water, not ground.
  const bay = Array.from({ length: bayCount }, () => {
    const depth = rng() ** 1.6;
    return [0.02 + rng() * 0.96, GROUND + 0.035 + depth * 0.19] as Point;
  });

  return [...towers, ...corniche, ...bay];
}

/**
 * 04 — the 91 mark. Built the way the real pack mark is: the numerals inside a
 * double ring, held by two sprigs of grain curving up each side. The gold
 * grains in the field are routed to the wreath, so the wheat reads as wheat.
 */
/**
 * Two sprigs of grain curving up each side, as on the pack mark. Each step
 * puts a grain on the stem and four leaves splayed outward at two lengths, so
 * the sprig reads as a wheat ear rather than a dotted arc.
 */
const STEM_RADIUS = 0.34;

function wreath(count: number, rng: () => number): Point[] {
  const points: Point[] = [];
  const perStep = 5;
  const steps = Math.max(4, Math.floor(count / (perStep * 2)));

  for (const side of [-1, 1]) {
    for (let s = 0; s < steps; s += 1) {
      const t = s / (steps - 1);
      // Sweep from just off the bottom up to nearly horizontal on each side.
      const angle = Math.PI / 2 + side * (0.14 + t * 1.36);
      const radius = STEM_RADIUS - t * 0.012;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const tx = -Math.sin(angle);
      const ty = Math.cos(angle);
      const cx = 0.5 + nx * radius;
      const cy = 0.5 + ny * radius;
      points.push([cx, cy]);

      // Four leaves: a short inner pair and a long outer pair.
      for (const lean of [-1, 1]) {
        for (const reach of [0.034, 0.062]) {
          const out = reach + rng() * 0.012;
          const along = lean * (out * 0.55 + rng() * 0.01);
          points.push([cx + nx * out + tx * along, cy + ny * out + ty * along]);
        }
      }
    }
  }

  while (points.length < count) {
    points.push(points[Math.floor(rng() * points.length)]);
  }
  return points.slice(0, count);
}

/** A single crisp ring, well clear of the wreath's leaf tips. */
function ring(count: number, rng: () => number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.012;
    const radius = 0.462 + (rng() - 0.5) * 0.006;
    return [
      0.5 + Math.cos(angle) * radius,
      0.5 + Math.sin(angle) * radius,
    ] as Point;
  });
}

function roundel(
  count: number,
  golds: readonly boolean[],
  rng: () => number,
): Point[] {
  const out = new Array<Point>(count);
  const goldIdx: number[] = [];
  const restIdx: number[] = [];
  for (let i = 0; i < count; i += 1) {
    (golds[i] ? goldIdx : restIdx).push(i);
  }

  const sprigs = wreath(goldIdx.length, rng);
  goldIdx.forEach((index, k) => {
    out[index] = sprigs[k];
  });

  // Most of the dark grain goes into the numerals — at this density they only
  // read as "91" if they are packed.
  const numeralCount = Math.round(restIdx.length * 0.85);
  const numerals = sampleText(
    "91",
    "700 238px Georgia, 'Times New Roman', serif",
    numeralCount,
    rng,
  ).map(([x, y]) => [0.5 + (x - 0.5) * 0.96, 0.5 + (y - 0.5) * 0.96] as Point);

  const outline = ring(restIdx.length - numerals.length, rng);
  const rest = [...numerals, ...outline];
  restIdx.forEach((index, k) => {
    out[index] = rest[k] ?? [0.5, 0.5];
  });

  return out;
}

export function buildStates(
  count: number,
  golds: readonly boolean[],
  rng: () => number,
): Point[][] {
  return [
    paddyRows(count, rng),
    swell(count, rng),
    skyline(count, rng),
    roundel(count, golds, rng),
  ];
}
