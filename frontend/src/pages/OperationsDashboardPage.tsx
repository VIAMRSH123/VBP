import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOperationsDashboard } from "../api/dashboard";
import { listDeadLetterQueue, replayDlqEntry } from "../api/pipeline";
import type { OperationsDashboard } from "../types";
import { StatCard } from "../components/StatCard";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Badge, type BadgeTone } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { IconPulse } from "../components/icons";

type Execution = OperationsDashboard["recent_executions"][number];

const STATUS_TONE: Record<string, BadgeTone> = {
  success: "success",
  running: "info",
  dead_letter: "danger",
  failed: "danger",
};

const COLUMNS: Column<Execution>[] = [
  { key: "workflow_name", header: "Workflow", sortValue: (e) => e.workflow_name, cell: (e) => <span style={{ color: "var(--ink)" }}>{e.workflow_name}</span> },
  { key: "current_stage", header: "Stage", sortValue: (e) => e.current_stage, cell: (e) => e.current_stage },
  { key: "status", header: "Status", sortValue: (e) => e.status, cell: (e) => <Badge tone={STATUS_TONE[e.status] ?? "neutral"} label={e.status.replace(/_/g, " ")} /> },
  { key: "retry_count", header: "Retries", numeric: true, sortValue: (e) => e.retry_count, cell: (e) => e.retry_count },
  { key: "started_at", header: "Started", sortValue: (e) => new Date(e.started_at).getTime(), cell: (e) => new Date(e.started_at).toLocaleString() },
];

export function OperationsDashboardPage() {
  const queryClient = useQueryClient();
  const opsQuery = useQuery({ queryKey: ["operations"], queryFn: getOperationsDashboard, refetchInterval: 10000 });
  const dlqQuery = useQuery({ queryKey: ["dlq"], queryFn: listDeadLetterQueue, refetchInterval: 10000 });

  const replayMutation = useMutation({
    mutationFn: replayDlqEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dlq"] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });

  if (opsQuery.isLoading) return <PageSkeleton />;
  if (opsQuery.isError || !opsQuery.data) return <ErrorBanner message="Failed to load operations data." />;

  const ops = opsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Operations Dashboard" description="Pipeline Orchestrator monitoring & recovery" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Success rate" value={`${ops.workflow_success_rate}%`} />
        <StatCard label="Total executions" value={ops.total_executions} />
        <StatCard label="Successful" value={ops.successful} tone="success" />
        <StatCard label="Running" value={ops.running} />
        <StatCard label="Dead letter queue" value={ops.dead_letter_queue_length} tone={ops.dead_letter_queue_length > 0 ? "danger" : "default"} />
      </div>

      <section className="space-y-3">
        <h2 className="card-title">Recent pipeline executions</h2>
        <DataTable
          caption="Recent pipeline executions"
          columns={COLUMNS}
          rows={ops.recent_executions}
          rowKey={(e) => e.id}
          emptyTitle="No executions yet"
          emptyDescription="Pipeline runs appear here as messages are processed."
        />
      </section>

      <section className="space-y-3">
        <h2 className="card-title">Dead letter queue</h2>
        <div className="card overflow-hidden">
          {dlqQuery.data && dlqQuery.data.length === 0 && (
            <EmptyState icon={IconPulse} title="Everything healthy" description="No failed executions are waiting for a replay." />
          )}
          <ul>
            {dlqQuery.data?.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {entry.workflow_name} <span style={{ color: "var(--ink-tertiary)" }}>@ {entry.stage}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--danger)" }}>{entry.error_details}</p>
                </div>
                <button type="button" onClick={() => replayMutation.mutate(entry.id)} disabled={replayMutation.isPending} className="btn-secondary shrink-0">
                  Replay
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
