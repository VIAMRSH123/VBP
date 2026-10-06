import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "./EmptyState";

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <div className="skeleton h-2.5 w-14" />
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-3.5 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-2 w-14" />
            <div className="skeleton mt-3 h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-5 h-48 w-full" />
      </div>
    </div>
  );
}

export function InlineSkeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-8 w-full" />
      ))}
    </div>
  );
}

/** Generic query error: retries every query that is currently in an error state. */
export function ErrorBanner({ message }: { message: string }) {
  const queryClient = useQueryClient();
  return (
    <ErrorState
      description={message}
      onRetry={() => queryClient.refetchQueries({ predicate: (q) => q.state.status === "error" })}
    />
  );
}
