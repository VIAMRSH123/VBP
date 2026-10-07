import { formatUtilization, type Warehouse } from "./data";
import { StatusDot } from "./StatusDot";

interface WarehouseSelectorProps {
  warehouses: Warehouse[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function WarehouseSelector({ warehouses, selectedId, hoveredId, onSelect, onHover }: WarehouseSelectorProps) {
  return (
    <nav className="card p-2.5" aria-label="Warehouse network">
      <p className="eyebrow px-2.5 pb-2 pt-1.5">Warehouse network</p>
      <ul className="grid grid-cols-2 gap-1 md:block md:space-y-1">
        {warehouses.map((warehouse) => {
          const isActive = warehouse.id === selectedId;
          const classes = ["wh-item", isActive ? "wh-item--active" : "", !isActive && warehouse.id === hoveredId ? "wh-item--hover" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={warehouse.id}>
              <button
                type="button"
                className={classes}
                aria-pressed={isActive}
                onClick={() => onSelect(warehouse.id)}
                onMouseEnter={() => onHover(warehouse.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(warehouse.id)}
                onBlur={() => onHover(null)}
              >
                <span className="mt-0.5 text-[11px] font-semibold tabular-nums" style={{ color: isActive ? "var(--success)" : "var(--ink-tertiary)" }}>
                  {warehouse.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                    {warehouse.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] tabular-nums" style={{ color: "var(--ink-secondary)" }}>
                    {warehouse.utilization === null ? "Capacity not set" : `${formatUtilization(warehouse.utilization)} utilization`}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
                    <StatusDot status={warehouse.status} size={6} />
                    {warehouse.status}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
