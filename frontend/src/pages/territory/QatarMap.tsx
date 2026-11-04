import { useMemo, type CSSProperties } from "react";
import type { TerritoryStat } from "../../api/dashboard";
import { formatCompactCurrency } from "../../lib/format";
import { rampColor, shade } from "./colors";
import { SHAPES, type Shape } from "./geo";
import type { Ping } from "./useLeadPings";

/** The map is drawn on a tilted plane: y is squashed, and height rises straight up. */
const TILT = 0.62;
const MAX_RISE = 24;
const MIN_RISE = 3;
const FOCUS_SCALE = 1.18;

interface QatarMapProps {
  stats: Record<string, TerritoryStat>;
  selected: string | null;
  hovered: string | null;
  pings: Ping[];
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
}

const flat = ([x, y]: readonly [number, number], lift = 0) => `${x.toFixed(1)},${(y * TILT - lift).toFixed(1)}`;

function riseFor(value: number, max: number): number {
  return max <= 0 || value <= 0 ? MIN_RISE : MIN_RISE + (MAX_RISE - MIN_RISE) * Math.sqrt(value / max);
}

interface RegionProps {
  shape: Shape;
  index: number;
  rise: number;
  tone: number;
  state: "idle" | "hovered" | "selected";
  dimmed: boolean;
  stat: TerritoryStat | undefined;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}

function Region({ shape, index, rise, tone, state, dimmed, stat, onSelect, onHover }: RegionProps) {
  const color = rampColor(tone);
  const pts = shape.outline;
  const id = `terr-${index}`;
  const [cx, cy] = shape.center;
  const seam = shade(color, -0.55);
  const label = `${shape.name}: ${stat?.leads ?? 0} leads, ${formatCompactCurrency(stat?.pipeline_value ?? 0)} open pipeline`;
  const value = stat && stat.pipeline_value > 0 ? formatCompactCurrency(stat.pipeline_value) : "";

  return (
    <g className="terr-enter" style={{ ["--i" as string]: index } as CSSProperties}>
      <g
        className={`terr-region terr-region--${state} ${dimmed ? "terr-region--dim" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={state === "selected"}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
      >
        <defs>
          <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={shade(color, 0.22)} />
            <stop offset="100%" stopColor={shade(color, -0.08)} />
          </linearGradient>
          <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(color, -0.3)} />
            <stop offset="100%" stopColor={shade(color, -0.62)} />
          </linearGradient>
        </defs>
        {pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length];
          return <polygon key={i} points={`${flat(p)} ${flat(q)} ${flat(q, rise)} ${flat(p, rise)}`} fill={`url(#${id}-wall)`} stroke={seam} strokeWidth="0.5" strokeLinejoin="round" />;
        })}
        <polygon points={pts.map((p) => flat(p, rise)).join(" ")} fill={`url(#${id}-top)`} className="terr-top" strokeLinejoin="round" />
        <text x={cx} y={cy * TILT - rise + 1} className={`terr-name ${tone > 0.55 ? "terr-ink-dark" : ""}`} textAnchor="middle">
          {shape.name}
        </text>
        {value && (
          <text x={cx} y={cy * TILT - rise + 10.5} className={`terr-value ${tone > 0.55 ? "terr-ink-dark" : ""}`} textAnchor="middle">
            {value}
          </text>
        )}
      </g>
    </g>
  );
}

export function QatarMap({ stats, selected, hovered, pings, onSelect, onHover }: QatarMapProps) {
  const maxValue = useMemo(() => Math.max(0, ...Object.values(stats).map((s) => s.pipeline_value)), [stats]);
  const ordered = useMemo(() => SHAPES.map((shape, index) => ({ shape, index })).sort((a, b) => a.shape.center[1] - b.shape.center[1]), []);

  const focus = selected ? SHAPES.find((s) => s.name === selected) : null;
  const camera: CSSProperties = focus
    ? { transform: `translate(${focus.center[0] * (1 - FOCUS_SCALE)}px, ${focus.center[1] * TILT * (1 - FOCUS_SCALE)}px) scale(${FOCUS_SCALE})` }
    : { transform: "none" };

  return (
    <svg viewBox="60 -20 240 300" className="terr-map" role="group" aria-label="Territory map of Qatar by open pipeline value">
      <defs>
        <radialGradient id="terr-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <filter id="terr-drop" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      <g className="terr-camera" style={camera}>
        <ellipse cx="185" cy="150" rx="140" ry="105" fill="url(#terr-pool)" />
        <g filter="url(#terr-drop)">
          {ordered.map(({ shape, index }) => {
            const stat = stats[shape.name];
            const state = selected === shape.name ? "selected" : hovered === shape.name ? "hovered" : "idle";
            return (
              <Region
                key={shape.name}
                shape={shape}
                index={index}
                rise={riseFor(stat?.pipeline_value ?? 0, maxValue)}
                tone={maxValue > 0 ? (stat?.pipeline_value ?? 0) / maxValue : 0}
                state={state}
                dimmed={selected !== null && selected !== shape.name}
                stat={stat}
                onSelect={() => onSelect(selected === shape.name ? null : shape.name)}
                onHover={(on) => onHover(on ? shape.name : null)}
              />
            );
          })}
        </g>
        {pings.map((ping) => {
          const shape = SHAPES.find((s) => s.name.toLowerCase() === ping.territory.trim().toLowerCase());
          if (!shape) return null;
          const rise = riseFor(stats[shape.name]?.pipeline_value ?? 0, maxValue);
          return (
            <g key={ping.key} transform={`translate(${shape.center[0]} ${shape.center[1] * TILT - rise})`} className="terr-ping" aria-hidden="true">
              <circle r="46" />
              <circle r="46" style={{ animationDelay: "0.45s" }} />
              <circle r="46" style={{ animationDelay: "0.9s" }} />
              <circle r="3.5" className="terr-ping__dot" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
