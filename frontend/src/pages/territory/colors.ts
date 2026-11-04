/** Value ramp for the territory map: dim slate (no pipeline) -> teal -> bright mint (largest pipeline). */
const STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0, [38, 57, 77]],
  [0.5, [31, 166, 181]],
  [1, [125, 243, 225]],
];

type Rgb = readonly [number, number, number];

const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

export function rampColor(t: number): Rgb {
  const x = Math.max(0, Math.min(1, t));
  const hi = STOPS.findIndex(([stop]) => stop >= x);
  if (hi <= 0) return STOPS[0][1];
  const [s0, c0] = STOPS[hi - 1];
  const [s1, c1] = STOPS[hi];
  const f = (x - s0) / (s1 - s0);
  return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
}

export function shade(color: Rgb, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const k = Math.abs(amount);
  return toHex([color[0] + (target - color[0]) * k, color[1] + (target - color[1]) * k, color[2] + (target - color[2]) * k]);
}

export const RAMP_CSS = `linear-gradient(90deg, ${toHex(STOPS[0][1])}, ${toHex(STOPS[1][1])}, ${toHex(STOPS[2][1])})`;
