import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listLeads } from "../api/leads";
import { PageSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { DataTable } from "../components/DataTable";
import { leadColumns } from "../components/leadColumns";
import { PageHeader } from "../components/PageHeader";
import { IconSearch } from "../components/icons";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { PIPELINE_STATUSES } from "../lib/pipeline";

const COLUMNS = [
  leadColumns.number,
  leadColumns.company,
  leadColumns.contact,
  leadColumns.product,
  leadColumns.status,
  leadColumns.priority,
  leadColumns.rep,
  leadColumns.score,
  leadColumns.dealValue,
];

export function LeadManagementPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get("status") ?? "";
  // `?q=` seeds the search (the ⌘K "Search leads" command lands here); the box keeps its own
  // draft so typing never waits on a refetch.
  const urlQuery = params.get("q") ?? "";
  const [draft, setDraft] = useState(urlQuery);
  const search = useDebouncedValue(draft.trim());

  useEffect(() => {
    setDraft(urlQuery);
  }, [urlQuery]);

  function setStatus(next: string) {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("status", next);
    else nextParams.delete("status");
    setParams(nextParams, { replace: true });
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ["leads", search, status],
    queryFn: () => listLeads({ search: search || undefined, status: status || undefined, limit: 100 }),
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });

  const filtered = Boolean(search || status);

  function clearFilters() {
    setDraft("");
    setParams({}, { replace: true });
  }

  if (isPending) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Lead Management"
        description={data ? `${data.total} ${data.total === 1 ? "lead" : "leads"}${filtered ? " match your filters" : ""}` : undefined}
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-80">
          <IconSearch width={14} height={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-tertiary)" }} />
          <input
            type="search"
            aria-label="Search leads"
            placeholder="Search company, contact, or lead number…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input-field w-full pl-8"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field" aria-label="Filter by status">
          <option value="">All statuses</option>
          {PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isError && <ErrorBanner message="Failed to load leads." />}

      {data && (
        <DataTable
          caption="Leads"
          columns={COLUMNS}
          rows={data.items}
          rowKey={(lead) => lead.id}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
          pageSize={15}
          emptyTitle={filtered ? "No leads match your filters" : "No leads yet"}
          emptyDescription={
            filtered ? "Try a different search term or status." : "Leads appear here as soon as they arrive from WhatsApp."
          }
          emptyAction={
            filtered ? (
              <button type="button" onClick={clearFilters} className="btn-secondary">
                Clear filters
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
