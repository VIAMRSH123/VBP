import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, runReminders } from "../api/notifications";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { Badge, type BadgeTone } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { IconBell } from "../components/icons";
import { useAuthStore } from "../store/authStore";

const TEMPLATE_TONE: Record<string, BadgeTone> = {
  LeadAssigned: "info",
  FollowUpDue: "warning",
  SLABreach: "danger",
  Won: "success",
  Lost: "neutral",
};

export function NotificationCenterPage() {
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();
  const canRun = role === "administrator" || role === "sales_manager";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 15000,
  });

  const runMutation = useMutation({
    mutationFn: runReminders,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification Centre"
        description="Assignments, reminders, and delivery tracking (WhatsApp)"
        actions={
          canRun && (
            <button type="button" onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="btn-primary">
              {runMutation.isPending ? "Running…" : "Run reminder sweep"}
            </button>
          )
        }
      />

      {runMutation.data && (
        <p className="text-xs" role="status" style={{ color: "var(--ink-tertiary)" }}>
          Sent: {runMutation.data.result.stage1} first reminders, {runMutation.data.result.stage2} second reminders,{" "}
          {runMutation.data.result.stage3_escalated} escalations.
        </p>
      )}

      {isError && <ErrorBanner message="Failed to load notifications." />}

      {data && (
        <section className="card overflow-hidden" aria-label="Notifications">
          {data.length === 0 ? (
            <EmptyState icon={IconBell} title="No notifications yet" description="Assignments and reminders will be listed here as they are sent." />
          ) : (
            <ul>
              {data.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-[var(--bg-secondary)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TEMPLATE_TONE[n.template] ?? "neutral"} label={n.template} />
                      <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                        to {n.recipient} ({n.recipient_role.replace(/_/g, " ")})
                      </span>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>{n.message}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <Badge tone={n.delivered ? "success" : "danger"} label={n.delivered ? "Delivered" : "Failed"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
