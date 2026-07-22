import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, runReminders } from "../api/notifications";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { useAuthStore } from "../store/authStore";

const TEMPLATE_STYLES: Record<string, { bg: string; text: string }> = {
  LeadAssigned: { bg: "#eef3fe", text: "#2563eb" },
  FollowUpDue: { bg: "#fffbeb", text: "#b45309" },
  SLABreach: { bg: "#fef2f2", text: "#dc2626" },
  Won: { bg: "#f0fdf4", text: "#16a34a" },
  Lost: { bg: "#f3f4f6", text: "#6b7280" },
};
const DEFAULT_TEMPLATE_STYLE = { bg: "#f3f4f6", text: "#6b7280" };

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Notifications</p>
          <h1 className="page-title">Notification Centre</h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
            Assignments, reminders, and delivery tracking (WhatsApp)
          </p>
        </div>
        {canRun && (
          <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="btn-primary px-5 py-2.5">
            {runMutation.isPending ? "Running..." : "Run Reminder Sweep"}
          </button>
        )}
      </div>

      {runMutation.data && (
        <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
          Sent: {runMutation.data.result.stage1} first reminders, {runMutation.data.result.stage2} second reminders,{" "}
          {runMutation.data.result.stage3_escalated} escalations.
        </p>
      )}

      {isError && <ErrorBanner message="Failed to load notifications." />}

      {data && (
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {data.map((n) => {
            const style = TEMPLATE_STYLES[n.template] ?? DEFAULT_TEMPLATE_STYLE;
            return (
              <div key={n.id} className="flex items-center justify-between gap-4 p-5" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: style.bg, color: style.text }}>
                      {n.template}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      to {n.recipient} ({n.recipient_role.replace(/_/g, " ")})
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>{n.message}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <span className="shrink-0 text-xs font-medium" style={{ color: n.delivered ? "#16a34a" : "#dc2626" }}>
                  {n.delivered ? "Delivered" : "Failed"}
                </span>
              </div>
            );
          })}
          {data.length === 0 && (
            <p className="py-16 text-center text-sm" style={{ color: "var(--ink-tertiary)" }}>No notifications yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
