import { useState, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepPerformance, type RepPerformance } from "../api/dashboard";
import { listRepresentatives, uploadRepresentativeCsv } from "../api/representatives";
import type { Representative } from "../types";
import { TableSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column } from "../components/DataTable";
import { Badge } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency } from "../lib/format";

const PERFORMANCE_COLUMNS: Column<RepPerformance>[] = [
  { key: "representative", header: "Representative", sortValue: (r) => r.representative, cell: (r) => <span style={{ color: "var(--ink)" }}>{r.representative}</span> },
  { key: "lead_count", header: "Leads", numeric: true, sortValue: (r) => r.lead_count, cell: (r) => r.lead_count },
  { key: "pipeline_value", header: "Pipeline value", numeric: true, sortValue: (r) => r.pipeline_value, cell: (r) => formatCurrency(r.pipeline_value) },
];

const ROSTER_COLUMNS: Column<Representative>[] = [
  { key: "code", header: "Code", sortValue: (r) => r.representative_code, cell: (r) => <span className="font-mono text-xs" style={{ color: "var(--ink)" }}>{r.representative_code}</span> },
  { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => <span style={{ color: "var(--ink)" }}>{r.name}</span> },
  { key: "territory", header: "Territory", sortValue: (r) => r.territory, cell: (r) => r.territory },
  { key: "category", header: "Category", sortValue: (r) => r.product_category, cell: (r) => r.product_category },
  { key: "language", header: "Language", sortValue: (r) => r.language, cell: (r) => r.language },
  { key: "workload", header: "Workload", numeric: true, sortValue: (r) => r.workload, cell: (r) => r.workload },
  { key: "active", header: "Status", sortValue: (r) => (r.active ? 1 : 0), cell: (r) => <Badge tone={r.active ? "success" : "neutral"} label={r.active ? "Active" : "Inactive"} /> },
];

export function SalesManagerPage() {
  const queryClient = useQueryClient();
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; message: string } | null>(null);

  const perfQuery = useQuery({ queryKey: ["rep-performance"], queryFn: () => getRepPerformance() });
  const repsQuery = useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives });

  const uploadMutation = useMutation({
    mutationFn: uploadRepresentativeCsv,
    onSuccess: (result) => {
      setUploadResult({ ok: true, message: `Loaded ${result.valid_rows}/${result.row_count} rows. ${result.errors || ""}` });
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
    },
    onError: () => setUploadResult({ ok: false, message: "Upload failed." }),
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const totalWorkload = repsQuery.data?.reduce((sum, r) => sum + r.workload, 0) ?? 0;
  const activeReps = repsQuery.data?.filter((r) => r.active).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Team" title="Sales Manager" description="Team performance, workload, and territory mapping" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Active representatives" value={activeReps} />
        <StatCard label="Total workload" value={totalWorkload} />
        <StatCard label="Territories covered" value={new Set(repsQuery.data?.map((r) => r.territory)).size || 0} />
      </div>

      <section className="card p-5">
        <h2 className="card-title">Upload representative CSV</h2>
        <p className="mb-4 mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>
          Columns: RepresentativeID, RepresentativeName, Territory, Region, ProductCategory, Language, Manager,
          ManagerPhone, Email, Phone, Workload, ActiveFlag
        </p>
        <label className="btn-secondary cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2" style={{ outlineColor: "var(--accent)" }}>
          {uploadMutation.isPending ? "Uploading…" : "Choose CSV file"}
          <input type="file" accept=".csv" onChange={handleFileChange} disabled={uploadMutation.isPending} className="sr-only" />
        </label>
        {uploadResult && (
          <p className="mt-3 text-xs" role="status" style={{ color: uploadResult.ok ? "var(--ink-secondary)" : "var(--danger)" }}>
            {uploadResult.message}
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="card-title p-5 pb-3">Representative performance</h2>
        {perfQuery.isLoading && <TableSkeleton rows={3} />}
        {perfQuery.isError && <div className="p-5 pt-0"><ErrorBanner message="Failed to load performance." /></div>}
        {perfQuery.data && (
          <DataTable
            bare
            caption="Representative performance"
            columns={PERFORMANCE_COLUMNS}
            rows={perfQuery.data}
            rowKey={(r) => r.representative_id}
            emptyTitle="No assignments yet"
            emptyDescription="Performance shows once leads are assigned."
          />
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="card-title p-5 pb-3">Representative roster</h2>
        {repsQuery.isLoading && <TableSkeleton rows={4} />}
        {repsQuery.data && (
          <DataTable
            bare
            caption="Representative roster"
            columns={ROSTER_COLUMNS}
            rows={repsQuery.data}
            rowKey={(r) => r.id}
            emptyTitle="No representatives yet"
            emptyDescription="Upload a CSV above to load your roster."
          />
        )}
      </section>
    </div>
  );
}
