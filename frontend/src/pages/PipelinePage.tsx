import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLeads, updateLeadStatus } from "../api/leads";
import { ErrorBanner, PageSkeleton } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { PIPELINE_STATUSES } from "../lib/pipeline";
import { canMove } from "../lib/statusTransitions";
import { useAuthStore } from "../store/authStore";
import type { Lead, LeadListResponse } from "../types";
import { Column, type DropState } from "./pipeline/Column";
import { LeadCard } from "./pipeline/LeadCard";
import "./pipeline/pipeline.css";

const BOARD_STATUSES = PIPELINE_STATUSES.filter((s) => s !== "Archived");
const WRITE_ROLES = ["administrator", "sales_manager", "sales_representative"];
const QUERY_KEY = ["pipeline-leads"];
const SHAKE_MS = 450;

function describeError(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail ?? "Could not move the lead. Try again.";
}

export function PipelinePage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canDrag = role !== undefined && WRITE_ROLES.includes(role);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [shakeStatus, setShakeStatus] = useState<string | null>(null);
  const [celebrations, setCelebrations] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listLeads({ limit: 200 }),
  });

  const move = useMutation({
    mutationFn: ({ lead, status }: { lead: Lead; status: string }) => updateLeadStatus(lead.id, status),
    onMutate: async ({ lead, status }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<LeadListResponse>(QUERY_KEY);
      queryClient.setQueryData<LeadListResponse>(QUERY_KEY, (old) =>
        old ? { ...old, items: old.items.map((l) => (l.id === lead.id ? { ...l, status, updated_at: new Date().toISOString() } : l)) } : old,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      setNotice(describeError(error));
    },
    onSuccess: (_data, { status }) => {
      setNotice(null);
      if (status === "Won") setCelebrations((n) => n + 1);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const byStatus = useMemo(() => {
    const groups: Record<string, Lead[]> = Object.fromEntries(BOARD_STATUSES.map((s) => [s, [] as Lead[]]));
    for (const lead of data?.items ?? []) groups[lead.status]?.push(lead);
    return groups;
  }, [data]);

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorBanner message="Failed to load the pipeline." />;

  const activeLead = activeId ? data.items.find((l) => l.id === activeId) ?? null : null;

  const dropStateFor = (status: string): DropState => {
    if (shakeStatus === status) return "shake";
    if (!activeLead || activeLead.status === status) return "idle";
    return canMove(activeLead.status, status) ? "valid" : "invalid";
  };

  const handleDragStart = (event: DragStartEvent) => {
    setNotice(null);
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const lead = data.items.find((l) => l.id === event.active.id);
    const target = event.over ? String(event.over.id) : null;
    if (!lead || !target || target === lead.status) return;
    if (!canMove(lead.status, target)) {
      setShakeStatus(target);
      setNotice(`${lead.lead_number} can't go from ${lead.status} to ${target} — move it one stage at a time.`);
      window.setTimeout(() => setShakeStatus(null), SHAKE_MS);
      return;
    }
    move.mutate({ lead, status: target });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pipeline"
        title="Deal board"
        description={canDrag ? "Drag a lead to the next stage. Only valid stages light up." : "Read-only view of every open lead by stage."}
      />
      {notice && (
        <p role="status" className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--ink-secondary)", background: "var(--bg-secondary)" }}>
          {notice}
        </p>
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="pipe-board">
          {BOARD_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              leads={byStatus[status] ?? []}
              dropState={dropStateFor(status)}
              canDrag={canDrag}
              celebrating={status === "Won" ? celebrations : 0}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {activeLead ? <LeadCard lead={activeLead} isLifted /> : null}
        </DragOverlay>
      </DndContext>
      {data.total > data.items.length && (
        <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
          Showing the latest {data.items.length} of {data.total} leads.
        </p>
      )}
    </div>
  );
}
