import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAuditLog, listConfiguration, upsertConfiguration, listUsers, createUser } from "../api/admin";
import { TableSkeleton, ErrorBanner } from "../components/LoadingSpinner";

const ROLES = ["administrator", "sales_manager", "sales_representative", "executive", "read_only_auditor"];

export function AdministrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Administration</p>
        <h1 className="page-title">Administration</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-secondary)" }}>
          Configuration, users, and audit trail
        </p>
      </div>

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
    <div className="card p-6">
      <p className="card-title mb-1">Configuration</p>
      <p className="mb-5 text-xs" style={{ color: "var(--ink-tertiary)" }}>Reminders, assignment rules</p>
      {isLoading && <TableSkeleton rows={3} />}
      <div className="space-y-2.5">
        {data?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 text-sm">
            <span className="w-56 shrink-0 font-mono text-xs" style={{ color: "var(--ink-tertiary)" }}>{c.key}</span>
            <input
              className="input-field flex-1 px-3 py-1.5"
              defaultValue={c.value}
              onChange={(e) => setEdits((prev) => ({ ...prev, [c.key]: e.target.value }))}
            />
            <button
              onClick={() => mutation.mutate({ key: c.key, value: edits[c.key] ?? c.value, category: c.category })}
              className="btn-secondary px-3.5 py-1.5 text-xs"
            >
              Save
            </button>
          </div>
        ))}
      </div>
    </div>
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
    <div className="card p-6">
      <p className="card-title mb-5">User Management</p>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 text-sm">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field px-3 py-1.5" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field px-3 py-1.5" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field px-3 py-1.5" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field px-3 py-1.5">
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button type="submit" disabled={mutation.isPending} className="btn-primary px-4 py-1.5 text-xs">
          Add User
        </button>
      </form>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {isLoading && <TableSkeleton rows={3} />}
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Name", "Email", "Role", "Active"].map((h) => (
              <th key={h} className="table-head-cell px-3 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="table-row">
              <td className="px-3 py-3.5" style={{ color: "var(--ink)" }}>{u.name}</td>
              <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{u.email}</td>
              <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{u.role.replace(/_/g, " ")}</td>
              <td className="px-3 py-3.5" style={{ color: "var(--ink-secondary)" }}>{u.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogSection() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["audit-log"], queryFn: () => listAuditLog(100) });

  return (
    <div className="card p-6">
      <p className="card-title mb-5">Audit Log</p>
      {isLoading && <TableSkeleton rows={4} />}
      {isError && <ErrorBanner message="Failed to load audit log." />}
      <div className="max-h-96 space-y-0 overflow-y-auto text-xs">
        {data?.map((entry) => (
          <div key={entry.id} className="flex gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="w-40 shrink-0" style={{ color: "var(--ink-tertiary)" }}>{new Date(entry.created_at).toLocaleString()}</span>
            <span className="w-40 shrink-0 font-medium" style={{ color: "var(--ink-secondary)" }}>{entry.actor}</span>
            <span className="w-56 shrink-0 font-mono" style={{ color: "var(--accent)" }}>{entry.action}</span>
            <span style={{ color: "var(--ink-secondary)" }}>{entry.details}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
