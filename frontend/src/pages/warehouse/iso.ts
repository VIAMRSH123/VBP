export const SCENE_WIDTH = 742;
export const SCENE_HEIGHT = 480;
export const GROUND_X = 490;
export const GROUND_Y = 330;

const COS_30 = Math.cos(Math.PI / 6);
const SIN_30 = 0.5;
const ORIGIN_X = 306;
const ORIGIN_Y = 52;

export type Point = readonly [number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}

export interface BoxFaces {
  top: string;
  left: string;
  right: string;
}

// Ground plane axes: +x runs down-right, +y runs down-left, z lifts straight up.
export function project(x: number, y: number, z = 0): Point {
  return [ORIGIN_X + (x - y) * COS_30, ORIGIN_Y + (x + y) * SIN_30 - z];
}

export function polygon(points: Point[]): string {
  return points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
}

export function boxFaces({ x, y, w, d, h }: Box, z = 0): BoxFaces {
  return {
    top: polygon([project(x, y, z + h), project(x + w, y, z + h), project(x + w, y + d, z + h), project(x, y + d, z + h)]),
    left: polygon([project(x, y + d, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x, y + d, z)]),
    right: polygon([project(x + w, y, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x + w, y, z)]),
  };
}

export function silhouette({ x, y, w, d, h }: Box, pad = 0): string {
  return polygon([
    project(x - pad, y - pad, h + pad),
    project(x + w + pad, y - pad, h + pad),
    project(x + w + pad, y - pad, 0),
    project(x + w + pad, y + d + pad, 0),
    project(x - pad, y + d + pad, 0),
    project(x - pad, y + d + pad, h + pad),
  ]);
}

// Quad on the front-left wall (plane y = box.y + box.d); s0/s1 run along x as 0..1.
export function leftWallQuad(box: Box, s0: number, s1: number, z0: number, z1: number): string {
  const wall = box.y + box.d;
  const xa = box.x + box.w * s0;
  const xb = box.x + box.w * s1;
  return polygon([project(xa, wall, z1), project(xb, wall, z1), project(xb, wall, z0), project(xa, wall, z0)]);
}

// Quad on the front-right wall (plane x = box.x + box.w); s0/s1 run along y as 0..1.
export function rightWallQuad(box: Box, s0: number, s1: number, z0: number, z1: number): string {
  const wall = box.x + box.w;
  const ya = box.y + box.d * s0;
  const yb = box.y + box.d * s1;
  return polygon([project(wall, ya, z1), project(wall, yb, z1), project(wall, yb, z0), project(wall, ya, z0)]);
}

export function groundQuad(x0: number, y0: number, x1: number, y1: number, z = 0): string {
  return polygon([project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]);
}

export function toPercent([px, py]: Point): { left: number; top: number } {
  return { left: (px / SCENE_WIDTH) * 100, top: (py / SCENE_HEIGHT) * 100 };
}
