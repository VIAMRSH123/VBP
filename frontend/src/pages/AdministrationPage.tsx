import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAuditLog, listConfiguration, upsertConfiguration, listUsers, createUser, type AdminUser } from "../api/admin";
import { TableSkeleton, ErrorBanner } from "../components/LoadingSpinner";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";

const ROLES = ["administrator", "sales_manager", "sales_representative", "executive", "read_only_auditor"];

const USER_COLUMNS: Column<AdminUser>[] = [
  { key: "name", header: "Name", sortValue: (u) => u.name, cell: (u) => <span style={{ color: "var(--ink)" }}>{u.name}</span> },
  { key: "email", header: "Email", sortValue: (u) => u.email, cell: (u) => u.email },
  { key: "role", header: "Role", sortValue: (u) => u.role, cell: (u) => <span className="capitalize">{u.role.replace(/_/g, " ")}</span> },
  { key: "active", header: "Status", sortValue: (u) => (u.active ? 1 : 0), cell: (u) => <Badge tone={u.active ? "success" : "neutral"} label={u.active ? "Active" : "Inactive"} /> },
];

export function AdministrationPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Administration" description="Configuration, users, and audit trail" />
      <ConfigurationSection />
      <UserManagementSection />
      <AuditLogSection />
    </div>
  );
}

function ConfigurationSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["configuration"], queryFn: listConfiguration });
  const [edits, setEdits] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (params: { key: string; value: string; category: string }) =>
      upsertConfiguration(params.key, params.value, params.category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["configuration"] }),
  });

  return (
    <section className="card p-5">
      <h2 className="card-title">Configuration</h2>
      <p className="mb-4 mt-1 text-xs" style={{ color: "var(--ink-tertiary)" }}>Reminders, assignment rules</p>
      {isLoading && <TableSkeleton rows={3} />}
      <div className="space-y-2">
        {data?.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <label htmlFor={`config-${c.key}`} className="w-full shrink-0 font-mono text-xs sm:w-56" style={{ color: "var(--ink-tertiary)" }}>
              {c.key}
            </label>
            <input
              id={`config-${c.key}`}
              className="input-field min-w-0 flex-1"
              defaultValue={c.value}
              onChange={(e) => setEdits((prev) => ({ ...prev, [c.key]: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => mutation.mutate({ key: c.key, value: edits[c.key] ?? c.value, category: c.category })}
              disabled={mutation.isPending}
              className="btn-secondary"
            >
              Save
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function UserManagementSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: listUsers });
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales_representative" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setForm({ name: "", email: "", password: "", role: "sales_representative" });
      setError("");
    },
    onError: () => setError("Failed to create user (email may already exist)."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <section className="card overflow-hidden">
      <div className="p-5 pb-4">
        <h2 className="card-title mb-4">User management</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input required aria-label="Name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          <input required type="email" aria-label="Email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          <input required type="password" aria-label="Password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" autoComplete="new-password" />
          <select aria-label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field capitalize">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            Add user
          </button>
        </form>
        {error && <p className="mt-3 text-xs" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {isLoading && <TableSkeleton rows={3} />}
      {data && (
        <DataTable
          bare
          caption="Users"
          columns={USER_COLUMNS}
          rows={data}
          rowKey={(u) => u.id}
          emptyTitle="No users yet"
          emptyDescription="Add the first user with the form above."
        />
      )}
    </section>
  );
}

function AuditLogSection() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["audit-log"], queryFn: () => listAuditLog(100) });

  return (
    <section className="card p-5">
      <h2 className="card-title mb-4">Audit log</h2>
      {isLoading && <TableSkeleton rows={4} />}
      {isError && <ErrorBanner message="Failed to load audit log." />}
      {data && data.length === 0 && <EmptyState title="No audit entries yet" description="Admin and pipeline actions are recorded here." />}
      <ul className="max-h-96 overflow-y-auto text-xs">
        {data?.map((entry) => (
          <li key={entry.id} className="flex flex-wrap gap-x-3 gap-y-0.5 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--border)" }}>
            <span className="w-40 shrink-0" style={{ color: "var(--ink-tertiary)" }}>{new Date(entry.created_at).toLocaleString()}</span>
            <span className="w-40 shrink-0 font-medium" style={{ color: "var(--ink-secondary)" }}>{entry.actor}</span>
            <span className="w-56 shrink-0 font-mono" style={{ color: "var(--ink)" }}>{entry.action}</span>
            <span style={{ color: "var(--ink-secondary)" }}>{entry.details}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
