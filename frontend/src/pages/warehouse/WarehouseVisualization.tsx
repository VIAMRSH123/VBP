import type { CSSProperties } from "react";
import { formatNumber, type Warehouse } from "./data";
import {
  GROUND_X,
  GROUND_Y,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  boxFaces,
  groundQuad,
  polygon,
  project,
  toPercent,
} from "./iso";
import { ROADS, SCENE_LAYOUT } from "./scene";
import { WarehouseBuilding } from "./WarehouseBuilding";

interface WarehouseVisualizationProps {
  warehouses: Warehouse[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const GRID_STEP = 35;

function anchorOf(warehouse: Warehouse) {
  const { box } = SCENE_LAYOUT[warehouse.id];
  return toPercent(project(box.x + box.w / 2, box.y + box.d / 2, box.h));
}

function Ground() {
  const slab = boxFaces({ x: 0, y: 0, w: GROUND_X, d: GROUND_Y, h: 10 }, -10);
  const xs = Array.from({ length: Math.floor(GROUND_X / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);
  const ys = Array.from({ length: Math.floor(GROUND_Y / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);

  return (
    <g>
      <polygon className="wh-ground-side wh-ground-side--left" points={slab.left} />
      <polygon className="wh-ground-side wh-ground-side--right" points={slab.right} />
      <polygon className="wh-ground" points={slab.top} />
      {xs.map((x) => (
        <polyline key={`gx${x}`} className="wh-grid" points={polygon([project(x, 0), project(x, GROUND_Y)])} />
      ))}
      {ys.map((y) => (
        <polyline key={`gy${y}`} className="wh-grid" points={polygon([project(0, y), project(GROUND_X, y)])} />
      ))}
      {ROADS.map((road) => {
        const horizontal = road.x1 - road.x0 > road.y1 - road.y0;
        const mid = horizontal ? (road.y0 + road.y1) / 2 : (road.x0 + road.x1) / 2;
        const line = horizontal
          ? [project(road.x0, mid), project(road.x1, mid)]
          : [project(mid, road.y0), project(mid, road.y1)];
        return (
          <g key={`${road.x0}-${road.y0}-${road.x1}-${road.y1}`}>
            <polygon className="wh-road" points={groundQuad(road.x0, road.y0, road.x1, road.y1)} />
            <polyline className="wh-road-line" points={polygon(line)} />
          </g>
        );
      })}
    </g>
  );
}

function SelectionMarker({ warehouse }: { warehouse: Warehouse }) {
  const { box } = SCENE_LAYOUT[warehouse.id];
  const [ax, ay] = project(box.x + box.w / 2, box.y + box.d / 2, box.h);
  return (
    <g key={warehouse.id} className="wh-marker" pointerEvents="none">
      <line x1={ax} y1={ay - 13} x2={ax} y2={ay - 3} />
      <polygon points={`${ax - 7},${ay - 24} ${ax + 7},${ay - 24} ${ax},${ay - 13}`} />
    </g>
  );
}

function Tooltip({ warehouse }: { warehouse: Warehouse }) {
  const { left, top } = anchorOf(warehouse);
  const placement = top < 42 ? "below" : "above";
  const align = left < 20 ? "start" : left > 80 ? "end" : "center";
  return (
    <div className={`wh-tip wh-tip--${placement} wh-tip--${align}`} style={{ left: `${left}%`, top: `${top}%` }} aria-hidden="true">
      <p className="wh-tip__eyebrow">Warehouse {warehouse.number}</p>
      <p className="wh-tip__name">{warehouse.name}</p>
      <dl className="wh-tip__stats">
        <div>
          <dt>Utilization</dt>
          <dd>{warehouse.utilization}%</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>{formatNumber(warehouse.totalStock)} units</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={warehouse.status === "Warning" ? "wh-tip__warn" : undefined}>{warehouse.status}</dd>
        </div>
      </dl>
    </div>
  );
}

export function WarehouseVisualization({ warehouses, selectedId, hoveredId, onSelect, onHover }: WarehouseVisualizationProps) {
  const ordered = [...warehouses].sort((a, b) => {
    const boxA = SCENE_LAYOUT[a.id].box;
    const boxB = SCENE_LAYOUT[b.id].box;
    return boxA.x + boxA.y - (boxB.x + boxB.y);
  });
  const selected = warehouses.find((w) => w.id === selectedId) ?? null;
  const hovered = warehouses.find((w) => w.id === hoveredId) ?? null;
  const hasSelection = selected !== null;

  return (
    <div className="wh-stage" onClick={() => onSelect(null)}>
      <div className="wh-stage__corners" aria-hidden="true" />
      <p className="wh-hud wh-hud--tl" aria-hidden="true">
        Network view <span>/ isometric</span>
      </p>

      <div className="wh-canvas" style={{ aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}` }}>
        <svg viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`} className="wh-svg" role="group" aria-label="Warehouse network map">
          <defs>
            <filter id="wh-blur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          <Ground />
          {ordered.map((warehouse) => (
            <WarehouseBuilding
              key={warehouse.id}
              warehouse={warehouse}
              layout={SCENE_LAYOUT[warehouse.id]}
              index={warehouses.indexOf(warehouse)}
              selected={warehouse.id === selectedId}
              hovered={warehouse.id === hoveredId}
              dimmed={hasSelection && warehouse.id !== selectedId}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
          {selected && <SelectionMarker warehouse={selected} />}
        </svg>

        <div className="wh-overlay">
          {warehouses.map((warehouse) => {
            const { left, top } = anchorOf(warehouse);
            const isSelected = warehouse.id === selectedId;
            const isHovered = warehouse.id === hoveredId;
            const classes = [
              "wh-chip",
              isSelected ? "wh-chip--selected" : isHovered ? "wh-chip--hover" : "",
              hasSelection && !isSelected ? "wh-chip--dim" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={warehouse.id}
                className={classes}
                style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                aria-hidden="true"
                onMouseEnter={() => onHover(warehouse.id)}
                onMouseLeave={() => onHover(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(warehouse.id);
                }}
              >
                <span className="wh-chip__num">{warehouse.number}</span>
                <span className="wh-chip__pct">{warehouse.utilization}%</span>
                {warehouse.status === "Warning" && <span className="wh-chip__warn" />}
              </div>
            );
          })}
          {hovered && <Tooltip warehouse={hovered} />}
        </div>
      </div>

      <div className="wh-legend" aria-hidden="true">
        <span><i className="wh-legend__dot wh-legend__dot--hover" />Hover</span>
        <span><i className="wh-legend__dot wh-legend__dot--selected" />Selected</span>
        <span><i className="wh-legend__dot wh-legend__dot--warning" />Warning</span>
      </div>
      <p className="wh-hud wh-hud--br" aria-hidden="true">Click a warehouse to inspect</p>
    </div>
  );
}
