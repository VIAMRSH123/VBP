import type { CSSProperties, KeyboardEvent } from "react";
import type { Warehouse } from "./data";
import { boxFaces, groundQuad, leftWallQuad, polygon, project, rightWallQuad, silhouette } from "./iso";
import type { Box } from "./iso";
import { CONTAINER_TONES, type SceneLayout, type YardItem } from "./scene";

interface WarehouseBuildingProps {
  warehouse: Warehouse;
  layout: SceneLayout;
  index: number;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

interface Tone {
  top: string;
  left: string;
  right: string;
}

const TRAILER_TONE: Tone = { top: "#8d9bb2", left: "#6f7d94", right: "#58667c" };
const CAB_TONE: Tone = { top: "#3f87b0", left: "#2d6a8e", right: "#245676" };

function BoxShape({ box, z = 0, tone }: { box: Box; z?: number; tone: Tone }) {
  const faces = boxFaces(box, z);
  return (
    <g>
      <polygon points={faces.left} fill={tone.left} />
      <polygon points={faces.right} fill={tone.right} />
      <polygon points={faces.top} fill={tone.top} />
    </g>
  );
}

function Truck({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <BoxShape box={{ x, y, w: 14, d: 24, h: 13 }} z={2} tone={TRAILER_TONE} />
      <BoxShape box={{ x: x + 1, y: y + 24, w: 12, d: 9, h: 10 }} z={2} tone={CAB_TONE} />
    </g>
  );
}

function Containers({ x, y, cols, rows, tone }: { x: number; y: number; cols: number; rows: number; tone: number }) {
  const palette = CONTAINER_TONES[tone % CONTAINER_TONES.length];
  const cells: { key: string; box: Box; tier: boolean }[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        key: `${r}-${c}`,
        box: { x: x + c * 17, y: y + r * 10, w: 16, d: 9, h: 8 },
        tier: (r + c) % 2 === 0,
      });
    }
  }
  return (
    <g>
      {cells.map(({ key, box, tier }) => (
        <g key={key}>
          <BoxShape box={box} tone={palette} />
          {tier && <BoxShape box={box} z={8} tone={CONTAINER_TONES[(tone + 1) % CONTAINER_TONES.length]} />}
        </g>
      ))}
    </g>
  );
}

function YardObjects({ items, box, layer }: { items: YardItem[]; box: Box; layer: YardItem["layer"] }) {
  return (
    <>
      {items
        .filter((item) => item.layer === layer)
        .map((item, i) =>
          item.kind === "truck" ? (
            <Truck key={`t${i}`} x={box.x + item.dx} y={box.y + item.dy} />
          ) : (
            <Containers
              key={`c${i}`}
              x={box.x + item.dx}
              y={box.y + item.dy}
              cols={item.cols ?? 1}
              rows={item.rows ?? 1}
              tone={item.tone ?? 0}
            />
          ),
        )}
    </>
  );
}

function RoofDetail({ box, style }: { box: Box; style: SceneLayout["roof"] }) {
  const { x, y, w, d, h } = box;

  if (style === "skylights") {
    return (
      <>
        {[0.16, 0.42, 0.68].map((a) => (
          <polygon key={a} className="wh-roof" points={groundQuad(x + w * a, y + 9, x + w * (a + 0.14), y + d - 9, h)} />
        ))}
      </>
    );
  }

  if (style === "hvac") {
    const units: Box[] = [
      { x: x + w * 0.18, y: y + d * 0.22, w: 18, d: 14, h: 7 },
      { x: x + w * 0.56, y: y + d * 0.52, w: 16, d: 16, h: 9 },
    ];
    return (
      <>
        {[0.3, 0.5, 0.7].map((s) => (
          <polyline
            key={s}
            className="wh-rib"
            points={polygon([project(x + 6, y + d * s, h), project(x + w - 6, y + d * s, h)])}
          />
        ))}
        {units.map((unit, i) => {
          const faces = boxFaces(unit, h);
          return (
            <g key={i}>
              <polygon className="wh-hvac wh-hvac--left" points={faces.left} />
              <polygon className="wh-hvac wh-hvac--right" points={faces.right} />
              <polygon className="wh-hvac wh-hvac--top" points={faces.top} />
            </g>
          );
        })}
      </>
    );
  }

  const panels: string[] = [];
  for (let c = 0; c < 3; c += 1) {
    for (let r = 0; r < 2; r += 1) {
      const x0 = x + w * (0.1 + c * 0.29);
      const y0 = y + d * (0.12 + r * 0.44);
      panels.push(groundQuad(x0, y0, x0 + w * 0.25, y0 + d * 0.38, h));
    }
  }
  return (
    <>
      {panels.map((points) => (
        <polygon key={points} className="wh-solar" points={points} />
      ))}
    </>
  );
}

function Walls({ box, docks }: { box: Box; docks: number }) {
  const { h } = box;
  const span = 0.8 / docks;
  return (
    <>
      {Array.from({ length: docks }, (_, k) => {
        const center = 0.1 + (k + 0.5) * span;
        const half = span * 0.3;
        return (
          <g key={`dock${k}`}>
            <polygon className="wh-door" points={leftWallQuad(box, center - half, center + half, 0, h * 0.46)} />
            <polygon className="wh-lamp" points={leftWallQuad(box, center - half, center + half, h * 0.52, h * 0.57)} />
          </g>
        );
      })}
      {Array.from({ length: 6 }, (_, k) => {
        const s0 = 0.08 + k * 0.145;
        return <polygon key={`win${k}`} className="wh-glass" points={rightWallQuad(box, s0, s0 + 0.1, h * 0.58, h * 0.8)} />;
      })}
    </>
  );
}

export function WarehouseBuilding({
  warehouse,
  layout,
  index,
  selected,
  hovered,
  dimmed,
  onSelect,
  onHover,
}: WarehouseBuildingProps) {
  const { box } = layout;
  const faces = boxFaces(box);
  const slab = groundQuad(box.x - 8, box.y - 8, box.x + box.w + 10, box.y + box.d + 30);

  const state = selected ? "wh--selected" : hovered ? "wh--hover" : "";
  const className = ["wh", state, dimmed ? "wh--dim" : ""].filter(Boolean).join(" ");

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(warehouse.id);
    }
  }

  const edgeTop = polygon([project(box.x, box.y, box.h), project(box.x + box.w, box.y, box.h), project(box.x + box.w, box.y + box.d, box.h), project(box.x, box.y + box.d, box.h)]);
  const edgeBase = polygon([project(box.x, box.y + box.d, 0), project(box.x + box.w, box.y + box.d, 0), project(box.x + box.w, box.y, 0)]);

  return (
    <g
      className={className}
      style={{ "--i": index } as CSSProperties}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Warehouse ${warehouse.number}, ${warehouse.name}, ${warehouse.utilization}% utilization`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(warehouse.id);
      }}
      onMouseEnter={() => onHover(warehouse.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(warehouse.id)}
      onBlur={() => onHover(null)}
      onKeyDown={handleKeyDown}
    >
      <polygon className="wh-glow" points={silhouette(box, 12)} filter="url(#wh-blur)" />
      <polygon className="wh-slab" points={slab} />

      <g className="wh-yard">
        <YardObjects items={layout.yard} box={box} layer="back" />
      </g>

      <g className="wh-lift">
        <polygon className="wh-f wh-f--left" points={faces.left} />
        <polygon className="wh-f wh-f--right" points={faces.right} />
        <polygon className="wh-f wh-f--top" points={faces.top} />
        <Walls box={box} docks={layout.docks} />
        <RoofDetail box={box} style={layout.roof} />
        <polygon className="wh-edge" points={edgeTop} />
        <polyline className="wh-edge" points={edgeBase} />
        <line className="wh-edge" x1={project(box.x + box.w, box.y + box.d, box.h)[0]} y1={project(box.x + box.w, box.y + box.d, box.h)[1]} x2={project(box.x + box.w, box.y + box.d, 0)[0]} y2={project(box.x + box.w, box.y + box.d, 0)[1]} />
      </g>

      <g className="wh-yard">
        <YardObjects items={layout.yard} box={box} layer="front" />
      </g>

      <polygon className="wh-ring" points={silhouette(box, 7)} />
      <polygon className="wh-hit" points={silhouette(box, 6)} />
      <polygon className="wh-hit" points={slab} />
    </g>
  );
}
