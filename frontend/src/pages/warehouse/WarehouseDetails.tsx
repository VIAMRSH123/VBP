import { IconWarehouse } from "../../components/icons";
import { formatNumber, type Warehouse } from "./data";
import { ActivityFeed, InventoryBreakdown, Section, StockHealth } from "./DetailSections";
import { StatusDot } from "./StatusDot";

const HIGH_UTILIZATION = 90;

function BigStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="stat-value mt-1.5 text-[1.625rem]">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wider" style={{ color: "var(--ink-tertiary)" }}>
        {unit}
      </p>
    </div>
  );
}

function FlowRow({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-[13px]">
      <span style={{ color: "var(--ink-secondary)" }}>{label}</span>
      <span className="font-medium tabular-nums" style={{ color: tone ?? "var(--ink)" }}>
        {formatNumber(value)} <span className="text-[11px] font-normal" style={{ color: "var(--ink-tertiary)" }}>units</span>
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span
        className="mb-4 grid h-12 w-12 place-items-center rounded-full"
        style={{ background: "var(--bg-secondary)", color: "var(--ink-tertiary)" }}
      >
        <IconWarehouse width={22} height={22} />
      </span>
      <p className="card-title uppercase tracking-wide">Select a warehouse</p>
      <p className="mt-2 max-w-[220px] text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Select a facility to view inventory and operational data.
      </p>
    </div>
  );
}

export function WarehouseDetails({ warehouse }: { warehouse: Warehouse | null }) {
  if (!warehouse) return <EmptyState />;

  const nearCapacity = warehouse.utilization !== null && warehouse.utilization >= HIGH_UTILIZATION;

  return (
    <article key={warehouse.id} className="card wh-panel-in overflow-hidden" aria-live="polite">
      <header className="px-5 pb-4 pt-5">
        <p className="eyebrow" style={{ color: "var(--success)" }}>
          Warehouse {warehouse.number}
        </p>
        <h2 className="section-title mt-1 text-xl">{warehouse.name}</h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-secondary)" }}>{warehouse.location}</p>
        <p className="mt-2.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-secondary)" }}>
          <StatusDot status={warehouse.status} />
          {warehouse.status}
        </p>
      </header>

      <Section title="Capacity">
        {warehouse.utilization === null || warehouse.capacity === null ? (
          <>
            <p className="stat-value">n/a</p>
            <p className="mt-1.5 text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
              No capacity is set for this warehouse in SAP, so utilization can't be calculated.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <p className="stat-value">{warehouse.utilization}%</p>
              <p className="pb-1 text-[11.5px] tabular-nums" style={{ color: "var(--ink-tertiary)" }}>
                {formatNumber(warehouse.totalStock)} / {formatNumber(warehouse.capacity)} units
              </p>
            </div>
            <div className="wh-bar mt-3" role="progressbar" aria-valuenow={Math.min(warehouse.utilization, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Capacity utilization">
              <div
                className="wh-bar__fill"
                style={{ width: `${Math.min(warehouse.utilization, 100)}%`, background: nearCapacity ? "var(--ai-bright)" : "var(--success)" }}
              />
            </div>
            {nearCapacity && <p className="mt-2 text-[11.5px]" style={{ color: "var(--ai)" }}>Approaching capacity</p>}
          </>
        )}
      </Section>

      <Section title="Stock">
        <div className="grid grid-cols-2 gap-4">
          <BigStat label="Stock on hand" value={formatNumber(warehouse.totalStock)} unit="units" />
          <BigStat label="SKU count" value={formatNumber(warehouse.skuCount)} unit="SKUs" />
        </div>
        <div className="mt-4 divide-y divide-[color:var(--border)]">
          <FlowRow label="Inbound" value={warehouse.inbound} />
          <FlowRow label="Outbound" value={warehouse.outbound} />
          <FlowRow label="Reserved" value={warehouse.reserved} />
          <FlowRow label="On order" value={warehouse.onOrder} />
          <FlowRow label="Available" value={warehouse.available} tone="var(--success)" />
        </div>
      </Section>

      <Section title="Inventory breakdown">
        <InventoryBreakdown categories={warehouse.breakdown} total={warehouse.totalStock} />
      </Section>

      <Section title="Stock health">
        <StockHealth health={warehouse.health} />
      </Section>

      <Section title="Recent activity">
        <ActivityFeed events={warehouse.activity} />
      </Section>
    </article>
  );
}
