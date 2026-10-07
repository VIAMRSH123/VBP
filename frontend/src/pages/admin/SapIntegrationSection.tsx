import { useState } from "react";
import { isAxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSapStatus, purgeMockSapData, triggerSapSync, type SapRunSummary, type SapStatus } from "../../api/sap";
import { Badge, type BadgeTone } from "../../components/StatusBadge";
import { ErrorBanner, TableSkeleton } from "../../components/LoadingSpinner";

const MODE_COPY: Record<SapStatus["mode"], { label: string; tone: BadgeTone; detail: string }> = {
  off: { label: "Off", tone: "neutral", detail: "Nothing is synced. Existing leads and the sample warehouses are untouched." },
  mock: { label: "Demo (mock SAP)", tone: "warning", detail: "Syncing a built-in demo dataset. Purge it before connecting the real system." },
  live: { label: "Live", tone: "success", detail: "Syncing from SAP Business One." },
};

const RUN_TONE: Record<SapRunSummary["status"], BadgeTone> = {
  success: "success",
  partial: "warning",
  failed: "danger",
  running: "info",
};

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.detail === "string") return error.response.data.detail;
  return "Something went wrong. Try again.";
}

export function SapIntegrationSection() {
  const queryClient = useQueryClient();
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sap-status"],
    queryFn: getSapStatus,
    refetchInterval: (query) => (query.state.data?.running ? 4000 : 30000),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["sap-status"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const sync = useMutation({ mutationFn: (mode: "incremental" | "backfill") => triggerSapSync({ mode }), onSuccess: refresh });
  const purge = useMutation({
    mutationFn: purgeMockSapData,
    onSuccess: () => {
      setConfirmingPurge(false);
      refresh();
    },
  });

  return (
    <section className="card p-5" aria-labelledby="sap-integration-title">
      <h2 id="sap-integration-title" className="card-title">SAP integration</h2>
      <p className="mb-4 mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>
        Leads, customers, orders and warehouse stock come from SAP Business One.
      </p>

      {isLoading && <TableSkeleton rows={3} />}
      {isError && <ErrorBanner message="Failed to load SAP status." />}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={MODE_COPY[data.mode].tone} label={MODE_COPY[data.mode].label} />
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>{MODE_COPY[data.mode].detail}</p>
          </div>

          {data.mode === "live" && !data.configured && (
            <ErrorBanner message="SAP_MODE is live but the connection settings are incomplete. Fill in the SAP_* values in backend/.env and restart." />
          )}
          {data.needs_reset && (
            <ErrorBanner message="Demo SAP data is still in the database. Purge it before the first live sync." />
          )}

          <LastRun status={data} />

          {data.last_error && (
            <p className="whitespace-pre-wrap rounded-md border p-3 font-mono text-xs" style={{ borderColor: "var(--border)", color: "var(--danger)" }}>
              {data.last_error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!data.enabled || data.running || data.needs_reset || sync.isPending}
              onClick={() => sync.mutate("incremental")}
            >
              {data.running ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!data.enabled || data.running || data.needs_reset || sync.isPending}
              onClick={() => sync.mutate("backfill")}
            >
              Full re-sync
            </button>
            {(data.mode === "mock" || data.needs_reset) && !confirmingPurge && (
              <button type="button" className="btn-secondary" onClick={() => setConfirmingPurge(true)}>
                Purge demo data
              </button>
            )}
            {confirmingPurge && (
              <>
                <button type="button" className="btn-primary" disabled={purge.isPending} onClick={() => purge.mutate()}>
                  Yes, delete demo data
                </button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmingPurge(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
          {(sync.isError || purge.isError) && (
            <p className="text-xs" role="alert" style={{ color: "var(--danger)" }}>
              {errorMessage(sync.error ?? purge.error)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function LastRun({ status }: { status: SapStatus }) {
  const run = status.last_run;
  if (!run) return <p className="text-sm" style={{ color: "var(--ink-tertiary)" }}>No sync has run yet.</p>;

  const started = run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : "—";
  const entries = Object.entries(run.counts);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={RUN_TONE[run.status]} label={run.status} />
        <span style={{ color: "var(--ink)" }}>
          Last {run.mode} sync {started}
        </span>
        <span style={{ color: "var(--ink-tertiary)" }}>· started by {run.triggered_by}</span>
      </div>
      {entries.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          {entries.map(([entity, c]) => (
            <div key={entity}>
              <dt className="eyebrow">{entity}</dt>
              <dd className="mt-0.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>
                {c.created} new · {c.updated} updated{c.failed ? ` · ${c.failed} failed` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {run.notifications_suppressed > 0 && (
        <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
          {run.notifications_suppressed} WhatsApp alerts were held back on this run.
        </p>
      )}
    </div>
  );
}
