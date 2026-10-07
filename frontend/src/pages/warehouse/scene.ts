import { createIso, type Box, type Iso } from "./iso";

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

export interface Road {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Scene {
  iso: Iso;
  layouts: Record<string, SceneLayout>;
  roads: Road[];
  mappedIds: string[];
  hiddenCount: number;
}

export const MAX_ON_MAP = 9;
const COLUMNS = 3;
const LOT_WIDTH = 104;
const LOT_DEPTH = 92;
const COLUMN_PITCH = 150;
const ROW_PITCH = 160;
const MIN_HEIGHT = 32;
const MAX_HEIGHT = 48;

export const CONTAINER_TONES: ReadonlyArray<{ top: string; left: string; right: string }> = [
  { top: "#2a8f93", left: "#1f7175", right: "#185a5e" },
  { top: "#b0623a", left: "#8e4d2d", right: "#723d23" },
  { top: "#4b6fb5", left: "#3a578f", right: "#2e4673" },
];

// FNV-1a: a stable hash so a warehouse always gets the same building, whatever order data arrives in.
function hash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function layoutFor(id: string, col: number, row: number, height: number): SceneLayout {
  const h = hash(id);
  const w = 88 + (h % 17);
  const d = 76 + ((h >>> 5) % 15);
  const box: Box = {
    x: 42 + col * COLUMN_PITCH + (LOT_WIDTH - w) / 2,
    y: 44 + row * ROW_PITCH + (LOT_DEPTH - d) / 2,
    w,
    d,
    h: height,
  };
  const roofs: RoofStyle[] = ["skylights", "hvac", "solar"];
  const yard: YardItem[] = [
    { kind: "truck", dx: 14 + ((h >>> 9) % 40), dy: d + 6, layer: "front" },
    { kind: "containers", dx: w + 6, dy: 10 + ((h >>> 13) % 20), layer: "front", cols: 1, rows: 2 + ((h >>> 17) % 3), tone: (h % 3) as 0 | 1 | 2 },
  ];
  if ((h >>> 3) % 2 === 0) yard.push({ kind: "truck", dx: 58 + ((h >>> 21) % 16), dy: d + 6, layer: "front" });
  return { box, roof: roofs[h % 3], docks: 3 + ((h >>> 7) % 3), yard };
}

/** Lays out up to MAX_ON_MAP warehouses on a 3-column grid. Building height reflects each one's share of stock. */
export function buildScene(ids: string[], stockById: Record<string, number> = {}): Scene {
  const ordered = [...ids].sort();
  const mappedIds = ordered.slice(0, MAX_ON_MAP);
  const cols = Math.max(1, Math.min(COLUMNS, mappedIds.length));
  const rows = Math.max(1, Math.ceil(mappedIds.length / COLUMNS));
  const groundX = 40 + cols * COLUMN_PITCH;
  const groundY = 10 + rows * ROW_PITCH;
  const maxStock = Math.max(...mappedIds.map((id) => stockById[id] ?? 0), 1);

  const layouts: Record<string, SceneLayout> = {};
  mappedIds.forEach((id, index) => {
    const share = (stockById[id] ?? 0) / maxStock;
    layouts[id] = layoutFor(id, index % COLUMNS, Math.floor(index / COLUMNS), Math.round(MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * share));
  });

  const roads: Road[] = [];
  for (let c = 0; c < cols - 1; c += 1) roads.push({ x0: 158 + c * COLUMN_PITCH, y0: 0, x1: 180 + c * COLUMN_PITCH, y1: groundY });
  for (let r = 0; r < rows - 1; r += 1) roads.push({ x0: 0, y0: 159 + r * ROW_PITCH, x1: groundX, y1: 181 + r * ROW_PITCH });
  roads.push({ x0: 0, y0: groundY - 26, x1: groundX, y1: groundY - 4 });
  roads.push({ x0: groundX - 28, y0: 0, x1: groundX - 6, y1: groundY });

  return { iso: createIso(groundX, groundY), layouts, roads, mappedIds, hiddenCount: ordered.length - mappedIds.length };
}
