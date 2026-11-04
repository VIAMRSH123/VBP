import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSpotlight } from "../../hooks/useSpotlight";
import { formatCompactCurrency } from "../../lib/format";
import type { Lead } from "../../types";
import { ConfettiBurst } from "./ConfettiBurst";
import { LeadCard } from "./LeadCard";

interface DraggableCardProps {
  lead: Lead;
  canDrag: boolean;
  index: number;
}

function DraggableCard({ lead, canDrag, index }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, disabled: !canDrag });
  return (
    <LeadCard
      ref={setNodeRef}
      lead={lead}
      isGhost={isDragging}
      className="stagger-in"
      style={{ ["--i" as string]: Math.min(index, 12), cursor: canDrag ? "grab" : "default" }}
      {...attributes}
      {...listeners}
    />
  );
}

export type DropState = "idle" | "valid" | "invalid" | "shake";

interface ColumnProps {
  status: string;
  leads: Lead[];
  dropState: DropState;
  canDrag: boolean;
  celebrating: number;
}

export function Column({ status, leads, dropState, canDrag, celebrating }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const spot = useSpotlight();
  const value = leads.reduce((sum, l) => sum + l.deal_size_estimate, 0);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${status}, ${leads.length} leads`}
      className={`pipe-col pipe-col--${dropState} ${isOver && dropState === "valid" ? "pipe-col--over" : ""} spotlight`}
      {...spot}
    >
      {celebrating > 0 && <ConfettiBurst key={celebrating} />}
      <header className="pipe-col__head">
        <h2 className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
          {status}
        </h2>
        <span className="pipe-col__count tabular-nums">{leads.length}</span>
      </header>
      <p className="px-3 pb-2 text-[11px] tabular-nums" style={{ color: "var(--ink-tertiary)" }}>
        {value > 0 ? formatCompactCurrency(value) : "No value yet"}
      </p>
      <div className="pipe-col__body">
        {leads.map((lead, i) => (
          <DraggableCard key={lead.id} lead={lead} canDrag={canDrag} index={i} />
        ))}
        {leads.length === 0 && <p className="pipe-col__empty">Drop a lead here</p>}
      </div>
    </section>
  );
}
