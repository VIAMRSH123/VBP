import type { Box } from "./iso";

export type RoofStyle = "skylights" | "hvac" | "solar";

export interface YardItem {
  kind: "truck" | "containers";
  // Offsets are relative to the building's back corner (box.x, box.y).
  dx: number;
  dy: number;
  layer: "back" | "front";
  // containers only
  cols?: number;
  rows?: number;
  tone?: 0 | 1 | 2;
}

export interface SceneLayout {
  box: Box;
  roof: RoofStyle;
  docks: number;
  yard: YardItem[];
}

const LOT_WIDTH = 104;
const LOT_DEPTH = 92;

function lot(col: number, row: number, w: number, d: number, h: number): Box {
  return {
    x: 42 + col * 150 + (LOT_WIDTH - w) / 2,
    y: 44 + row * 160 + (LOT_DEPTH - d) / 2,
    w,
    d,
    h,
  };
}

// Pure visual config — keyed by warehouse id. Every number the user reads comes from data.ts.
export const SCENE_LAYOUT: Record<string, SceneLayout> = {
  WH01: {
    box: lot(0, 0, 100, 82, 40),
    roof: "skylights",
    docks: 4,
    yard: [
      { kind: "truck", dx: 18, dy: 88, layer: "front" },
      { kind: "containers", dx: 108, dy: 14, layer: "front", cols: 1, rows: 3, tone: 0 },
    ],
  },
  WH02: {
    box: lot(1, 0, 92, 76, 34),
    roof: "hvac",
    docks: 3,
    yard: [
      { kind: "truck", dx: 52, dy: 82, layer: "front" },
      { kind: "containers", dx: 98, dy: 6, layer: "front", cols: 1, rows: 2, tone: 2 },
    ],
  },
  WH03: {
    box: lot(2, 0, 98, 88, 46),
    roof: "solar",
    docks: 5,
    yard: [
      { kind: "truck", dx: 14, dy: 94, layer: "front" },
      { kind: "truck", dx: 58, dy: 94, layer: "front" },
      { kind: "containers", dx: 104, dy: 30, layer: "front", cols: 1, rows: 3, tone: 1 },
    ],
  },
  WH04: {
    box: lot(0, 1, 88, 78, 32),
    roof: "hvac",
    docks: 3,
    yard: [
      { kind: "truck", dx: 30, dy: 84, layer: "front" },
      { kind: "containers", dx: -30, dy: 12, layer: "back", cols: 1, rows: 3, tone: 0 },
    ],
  },
  WH05: {
    box: lot(1, 1, 104, 90, 44),
    roof: "skylights",
    docks: 5,
    yard: [
      { kind: "truck", dx: 16, dy: 96, layer: "front" },
      { kind: "containers", dx: 110, dy: 18, layer: "front", cols: 1, rows: 4, tone: 2 },
    ],
  },
  WH06: {
    box: lot(2, 1, 96, 80, 38),
    roof: "solar",
    docks: 4,
    yard: [
      { kind: "truck", dx: 44, dy: 86, layer: "front" },
      { kind: "containers", dx: 102, dy: 22, layer: "front", cols: 1, rows: 3, tone: 1 },
    ],
  },
};

export const ROADS: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }> = [
  { x0: 0, y0: 159, x1: 490, y1: 181 },
  { x0: 158, y0: 0, x1: 180, y1: 330 },
  { x0: 308, y0: 0, x1: 330, y1: 330 },
  { x0: 0, y0: 304, x1: 490, y1: 326 },
  { x0: 462, y0: 0, x1: 484, y1: 330 },
];

export const CONTAINER_TONES: ReadonlyArray<{ top: string; left: string; right: string }> = [
  { top: "#2a8f93", left: "#1f7175", right: "#185a5e" },
  { top: "#b0623a", left: "#8e4d2d", right: "#723d23" },
  { top: "#4b6fb5", left: "#3a578f", right: "#2e4673" },
];
