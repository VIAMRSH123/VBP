import type { Point } from "../warehouse/iso";

/**
 * Stylised outline of Qatar's municipalities on a 0-480 grid, north up. Neighbouring regions share
 * vertices so the map tiles cleanly. This is a schematic, not a survey-accurate boundary.
 */
export interface Region {
  name: string;
  points: Point[];
}

export const REGIONS: Region[] = [
  { name: "Al Shamal", points: [[190, 10], [225, 40], [235, 95], [150, 100], [165, 40]] },
  { name: "Al Khor", points: [[150, 100], [235, 95], [245, 135], [252, 180], [195, 175], [135, 170]] },
  { name: "Umm Salal", points: [[135, 170], [195, 175], [195, 232], [120, 240]] },
  { name: "Al Daayen", points: [[195, 175], [252, 180], [270, 232], [195, 232]] },
  { name: "Doha", points: [[195, 232], [270, 232], [278, 285], [200, 290]] },
  { name: "Al Rayyan", points: [[120, 240], [195, 232], [200, 290], [185, 330], [100, 300]] },
  { name: "Al Shahaniya", points: [[100, 300], [185, 330], [180, 440], [120, 440], [90, 380]] },
  { name: "Al Wakrah", points: [[200, 290], [278, 285], [262, 335], [250, 390], [200, 450], [180, 440], [185, 330]] },
];

const BY_LOWER = new Map(REGIONS.map((r) => [r.name.toLowerCase(), r.name]));

/** Maps a free-text lead territory onto a drawn region, or null when it isn't one of them. */
export function regionFor(territory: string): string | null {
  return BY_LOWER.get(territory.trim().toLowerCase()) ?? null;
}

export function centroid(points: Point[]): Point {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** Pulls every vertex `amount` units toward the centre, opening a gap between neighbouring regions. */
export function inset(points: Point[], amount: number): Point[] {
  const [cx, cy] = centroid(points);
  return points.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * amount, y + (dy / len) * amount] as Point;
  });
}

/** Chaikin corner-cutting on a closed polygon: each pass rounds the corners a little more. */
export function smooth(points: Point[], passes = 2): Point[] {
  let current = points;
  for (let i = 0; i < passes; i += 1) {
    const next: Point[] = [];
    current.forEach((p, idx) => {
      const q = current[(idx + 1) % current.length];
      next.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]);
    });
    current = next;
  }
  return current;
}

export interface Shape {
  name: string;
  /** Rounded, inset outline used for drawing. */
  outline: Point[];
  center: Point;
}

export const SHAPES: Shape[] = REGIONS.map((r) => ({ name: r.name, outline: smooth(inset(r.points, 3.5), 2), center: centroid(r.points) }));
