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

const COS_30 = Math.cos(Math.PI / 6);
const SIN_30 = 0.5;
const ORIGIN_Y = 52; // headroom above the back corner for the tallest building and its label
const SIDE_MARGIN = 20;

export function polygon(points: Point[]): string {
  return points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
}

/** Projection helpers bound to one scene size. Ground axes: +x runs down-right, +y down-left, z straight up. */
export interface Iso {
  width: number;
  height: number;
  groundX: number;
  groundY: number;
  project(x: number, y: number, z?: number): Point;
  boxFaces(box: Box, z?: number): BoxFaces;
  silhouette(box: Box, pad?: number): string;
  leftWallQuad(box: Box, s0: number, s1: number, z0: number, z1: number): string;
  rightWallQuad(box: Box, s0: number, s1: number, z0: number, z1: number): string;
  groundQuad(x0: number, y0: number, x1: number, y1: number, z?: number): string;
  toPercent(point: Point): { left: number; top: number };
}

export function createIso(groundX: number, groundY: number): Iso {
  const originX = groundY * COS_30 + SIDE_MARGIN;
  const width = Math.ceil((groundX + groundY) * COS_30 + 32);
  const height = Math.ceil((groundX + groundY) * SIN_30 + 70);

  const project = (x: number, y: number, z = 0): Point => [originX + (x - y) * COS_30, ORIGIN_Y + (x + y) * SIN_30 - z];

  return {
    width,
    height,
    groundX,
    groundY,
    project,
    boxFaces({ x, y, w, d, h }, z = 0) {
      return {
        top: polygon([project(x, y, z + h), project(x + w, y, z + h), project(x + w, y + d, z + h), project(x, y + d, z + h)]),
        left: polygon([project(x, y + d, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x, y + d, z)]),
        right: polygon([project(x + w, y, z + h), project(x + w, y + d, z + h), project(x + w, y + d, z), project(x + w, y, z)]),
      };
    },
    silhouette({ x, y, w, d, h }, pad = 0) {
      return polygon([
        project(x - pad, y - pad, h + pad),
        project(x + w + pad, y - pad, h + pad),
        project(x + w + pad, y - pad, 0),
        project(x + w + pad, y + d + pad, 0),
        project(x - pad, y + d + pad, 0),
        project(x - pad, y + d + pad, h + pad),
      ]);
    },
    // Quad on the front-left wall (plane y = box.y + box.d); s0/s1 run along x as 0..1.
    leftWallQuad(box, s0, s1, z0, z1) {
      const wall = box.y + box.d;
      const xa = box.x + box.w * s0;
      const xb = box.x + box.w * s1;
      return polygon([project(xa, wall, z1), project(xb, wall, z1), project(xb, wall, z0), project(xa, wall, z0)]);
    },
    // Quad on the front-right wall (plane x = box.x + box.w); s0/s1 run along y as 0..1.
    rightWallQuad(box, s0, s1, z0, z1) {
      const wall = box.x + box.w;
      const ya = box.y + box.d * s0;
      const yb = box.y + box.d * s1;
      return polygon([project(wall, ya, z1), project(wall, yb, z1), project(wall, yb, z0), project(wall, ya, z0)]);
    },
    groundQuad(x0, y0, x1, y1, z = 0) {
      return polygon([project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]);
    },
    toPercent([px, py]) {
      return { left: (px / width) * 100, top: (py / height) * 100 };
    },
  };
}
