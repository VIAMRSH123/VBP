import type { WarehouseStatus } from "./data";

const STATUS_COLOR: Record<WarehouseStatus, string> = {
  Operational: "var(--success)",
  Warning: "var(--ai-bright)",
};

export function StatusDot({ status, size = 7 }: { status: WarehouseStatus; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: STATUS_COLOR[status] }}
    />
  );
}
