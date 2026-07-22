import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOperationsDashboard } from "../api/dashboard";
import { listDeadLetterQueue, replayDlqEntry } from "../api/pipeline";
import { StatCard } from "../components/StatCard";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";

const STATUS_COLOR: Record<string, string> = {
  success: "#16a34a",
  running: "#2563eb",
  dead_letter: "#dc2626",
};

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
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Operations</p>
        <h1 className="page-title">Operations Dashboard</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          Pipeline Orchestrator monitoring &amp; recovery
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Success Rate" value={`${ops.workflow_success_rate}%`} />
        <StatCard label="Total Executions" value={ops.total_executions} />
        <StatCard label="Successful" value={ops.successful} tone="success" />
        <StatCard label="Running" value={ops.running} />
        <StatCard label="Dead Letter Queue" value={ops.dead_letter_queue_length} tone={ops.dead_letter_queue_length > 0 ? "danger" : "default"} />
      </div>

      <div className="card p-6">
        <p className="card-title mb-5">Recent Pipeline Executions</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Workflow", "Stage", "Status", "Retries", "Started"].map((h) => (
                <th key={h} className="table-head-cell px-3 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ops.recent_executions.map((e) => (
              <tr key={e.id} className="table-row">
                <td className="px-3 py-3.5" style={{ color: "var(--ink)" }}>{e.workflow_name}</td>
                <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{e.current_stage}</td>
                <td className="px-3 py-3.5 font-medium" style={{ color: STATUS_COLOR[e.status] ?? "var(--ink)" }}>{e.status}</td>
                <td className="px-3 py-3.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{e.retry_count}</td>
                <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{new Date(e.started_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-6">
        <p className="card-title mb-5">Dead Letter Queue</p>
        {dlqQuery.data && dlqQuery.data.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: "var(--ink-tertiary)" }}>
            No failed executions. Everything healthy.
          </p>
        )}
        <ul className="space-y-2.5">
          {dlqQuery.data?.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between rounded-2xl p-4 text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div>
                <p className="font-medium" style={{ color: "#b91c1c" }}>{entry.workflow_name} @ {entry.stage}</p>
                <p className="text-xs" style={{ color: "#dc2626" }}>{entry.error_details}</p>
              </div>
              <button
                onClick={() => replayMutation.mutate(entry.id)}
                disabled={replayMutation.isPending}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ border: "1px solid #fca5a5", color: "#b91c1c" }}
              >
                Replay
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
