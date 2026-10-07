import { useMemo, type CSSProperties } from "react";
import { formatNumber, formatUtilization, type Warehouse } from "./data";
import { polygon, type Iso } from "./iso";
import { IsoContext } from "./iso-context";
import { buildScene, type Scene } from "./scene";
import { WarehouseBuilding } from "./WarehouseBuilding";

interface WarehouseVisualizationProps {
  warehouses: Warehouse[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const GRID_STEP = 35;

function anchorOf(scene: Scene, id: string) {
  const { box } = scene.layouts[id];
  return scene.iso.toPercent(scene.iso.project(box.x + box.w / 2, box.y + box.d / 2, box.h));
}

function Ground({ scene }: { scene: Scene }) {
  const { iso, roads } = scene;
  const slab = iso.boxFaces({ x: 0, y: 0, w: iso.groundX, d: iso.groundY, h: 10 }, -10);
  const xs = Array.from({ length: Math.floor(iso.groundX / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);
  const ys = Array.from({ length: Math.floor(iso.groundY / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);

  return (
    <g>
      <polygon className="wh-ground-side wh-ground-side--left" points={slab.left} />
      <polygon className="wh-ground-side wh-ground-side--right" points={slab.right} />
      <polygon className="wh-ground" points={slab.top} />
      {xs.map((x) => (
        <polyline key={`gx${x}`} className="wh-grid" points={polygon([iso.project(x, 0), iso.project(x, iso.groundY)])} />
      ))}
      {ys.map((y) => (
        <polyline key={`gy${y}`} className="wh-grid" points={polygon([iso.project(0, y), iso.project(iso.groundX, y)])} />
      ))}
      {roads.map((road) => {
        const horizontal = road.x1 - road.x0 > road.y1 - road.y0;
        const mid = horizontal ? (road.y0 + road.y1) / 2 : (road.x0 + road.x1) / 2;
        const line = horizontal ? [iso.project(road.x0, mid), iso.project(road.x1, mid)] : [iso.project(mid, road.y0), iso.project(mid, road.y1)];
        return (
          <g key={`${road.x0}-${road.y0}-${road.x1}-${road.y1}`}>
            <polygon className="wh-road" points={iso.groundQuad(road.x0, road.y0, road.x1, road.y1)} />
            <polyline className="wh-road-line" points={polygon(line)} />
          </g>
        );
      })}
    </g>
  );
}

function SelectionMarker({ scene, id }: { scene: Scene; id: string }) {
  const { box } = scene.layouts[id];
  const [ax, ay] = scene.iso.project(box.x + box.w / 2, box.y + box.d / 2, box.h);
  return (
    <g key={id} className="wh-marker" pointerEvents="none">
      <line x1={ax} y1={ay - 13} x2={ax} y2={ay - 3} />
      <polygon points={`${ax - 7},${ay - 24} ${ax + 7},${ay - 24} ${ax},${ay - 13}`} />
    </g>
  );
}

function Tooltip({ scene, warehouse }: { scene: Scene; warehouse: Warehouse }) {
  const { left, top } = anchorOf(scene, warehouse.id);
  const placement = top < 42 ? "below" : "above";
  const align = left < 20 ? "start" : left > 80 ? "end" : "center";
  return (
    <div className={`wh-tip wh-tip--${placement} wh-tip--${align}`} style={{ left: `${left}%`, top: `${top}%` }} aria-hidden="true">
      <p className="wh-tip__eyebrow">Warehouse {warehouse.number}</p>
      <p className="wh-tip__name">{warehouse.name}</p>
      <dl className="wh-tip__stats">
        <div>
          <dt>Utilization</dt>
          <dd>{formatUtilization(warehouse.utilization)}</dd>
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
  // The layout only changes when the set of warehouses or their relative stock does, not on every refetch,
  // so the memo is keyed on a serialized copy of exactly those inputs.
  const sceneInput = JSON.stringify(warehouses.map((w) => [w.id, w.totalStock]));
  const scene = useMemo(() => {
    const entries = JSON.parse(sceneInput) as [string, number][];
    return buildScene(entries.map(([id]) => id), Object.fromEntries(entries));
  }, [sceneInput]);

  const onMap = warehouses.filter((w) => scene.layouts[w.id]);
  const ordered = [...onMap].sort((a, b) => {
    const boxA = scene.layouts[a.id].box;
    const boxB = scene.layouts[b.id].box;
    return boxA.x + boxA.y - (boxB.x + boxB.y);
  });
  const selected = onMap.find((w) => w.id === selectedId) ?? null;
  const hovered = onMap.find((w) => w.id === hoveredId) ?? null;
  const hasSelection = warehouses.some((w) => w.id === selectedId);
  const iso: Iso = scene.iso;

  return (
    <div className="wh-stage" onClick={() => onSelect(null)}>
      <div className="wh-stage__corners" aria-hidden="true" />
      <p className="wh-hud wh-hud--tl" aria-hidden="true">
        Network view <span>/ isometric{scene.hiddenCount > 0 ? ` · +${scene.hiddenCount} more in the list` : ""}</span>
      </p>

      <div className="wh-canvas" style={{ aspectRatio: `${iso.width} / ${iso.height}` }}>
        <IsoContext.Provider value={iso}>
          <svg viewBox={`0 0 ${iso.width} ${iso.height}`} className="wh-svg" role="group" aria-label="Warehouse network map">
            <defs>
              <filter id="wh-blur" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>
            <Ground scene={scene} />
            {ordered.map((warehouse) => (
              <WarehouseBuilding
                key={warehouse.id}
                warehouse={warehouse}
                layout={scene.layouts[warehouse.id]}
                index={onMap.indexOf(warehouse)}
                selected={warehouse.id === selectedId}
                hovered={warehouse.id === hoveredId}
                dimmed={hasSelection && warehouse.id !== selectedId}
                onSelect={onSelect}
                onHover={onHover}
              />
            ))}
            {selected && <SelectionMarker scene={scene} id={selected.id} />}
          </svg>
        </IsoContext.Provider>

        <div className="wh-overlay">
          {onMap.map((warehouse) => {
            const { left, top } = anchorOf(scene, warehouse.id);
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
                <span className="wh-chip__pct">{formatUtilization(warehouse.utilization)}</span>
                {warehouse.status === "Warning" && <span className="wh-chip__warn" />}
              </div>
            );
          })}
          {hovered && <Tooltip scene={scene} warehouse={hovered} />}
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
