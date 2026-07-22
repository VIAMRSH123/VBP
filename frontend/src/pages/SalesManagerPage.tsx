import { useState, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepPerformance } from "../api/dashboard";
import { listRepresentatives, uploadRepresentativeCsv } from "../api/representatives";
import { TableSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { StatCard } from "../components/StatCard";

export function SalesManagerPage() {
  const queryClient = useQueryClient();
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const perfQuery = useQuery({ queryKey: ["rep-performance"], queryFn: () => getRepPerformance() });
  const repsQuery = useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives });

  const uploadMutation = useMutation({
    mutationFn: uploadRepresentativeCsv,
    onSuccess: (result) => {
      setUploadResult(`Loaded ${result.valid_rows}/${result.row_count} rows. ${result.errors || ""}`);
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
    },
    onError: () => setUploadResult("Upload failed."),
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const totalWorkload = repsQuery.data?.reduce((sum, r) => sum + r.workload, 0) ?? 0;
  const activeReps = repsQuery.data?.filter((r) => r.active).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Team</p>
        <h1 className="page-title">Sales Manager</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          Team performance, workload, and territory mapping
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Active Representatives" value={activeReps} />
        <StatCard label="Total Workload" value={totalWorkload} />
        <StatCard label="Territories Covered" value={new Set(repsQuery.data?.map((r) => r.territory)).size || 0} />
      </div>

      <div className="card p-6">
        <p className="card-title mb-1.5">Upload Representative CSV</p>
        <p className="mb-4 text-xs" style={{ color: "var(--ink-tertiary)" }}>
          Columns: RepresentativeID, RepresentativeName, Territory, Region, ProductCategory, Language, Manager,
          ManagerPhone, Email, Phone, Workload, ActiveFlag
        </p>
        <label className="btn-secondary inline-flex cursor-pointer items-center px-4 py-2 text-xs">
          {uploadMutation.isPending ? "Uploading..." : "Choose CSV file"}
          <input type="file" accept=".csv" onChange={handleFileChange} disabled={uploadMutation.isPending} className="hidden" />
        </label>
        {uploadResult && <p className="mt-3 text-xs" style={{ color: "var(--ink-secondary)" }}>{uploadResult}</p>}
      </div>

      <div className="card p-6">
        <p className="card-title mb-5">Representative Performance</p>
        {perfQuery.isLoading && <TableSkeleton rows={3} />}
        {perfQuery.isError && <ErrorBanner message="Failed to load performance." />}
        {perfQuery.data && (
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Representative", "Lead Count", "Pipeline Value"].map((h) => (
                  <th key={h} className="table-head-cell px-3 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfQuery.data.map((row) => (
                <tr key={row.representative} className="table-row">
                  <td className="px-3 py-3.5" style={{ color: "var(--ink)" }}>{row.representative}</td>
                  <td className="px-3 py-3.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{row.lead_count}</td>
                  <td className="px-3 py-3.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>${row.pipeline_value.toLocaleString()}</td>
                </tr>
              ))}
              {perfQuery.data.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-12 text-center" style={{ color: "var(--ink-tertiary)" }}>No assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-6">
        <p className="card-title mb-5">Representative Roster</p>
        {repsQuery.isLoading && <TableSkeleton rows={4} />}
        {repsQuery.data && (
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Code", "Name", "Territory", "Category", "Language", "Workload", "Active"].map((h) => (
                  <th key={h} className="table-head-cell px-3 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repsQuery.data.map((rep) => (
                <tr key={rep.id} className="table-row">
                  <td className="px-3 py-3.5 font-medium" style={{ color: "var(--ink)" }}>{rep.representative_code}</td>
                  <td className="px-3 py-3.5" style={{ color: "var(--ink)" }}>{rep.name}</td>
                  <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{rep.territory}</td>
                  <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{rep.product_category}</td>
                  <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{rep.language}</td>
                  <td className="px-3 py-3.5 tabular-nums" style={{ color: "var(--ink-secondary)" }}>{rep.workload}</td>
                  <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{rep.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
