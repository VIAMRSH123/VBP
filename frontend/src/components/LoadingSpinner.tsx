export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-9 w-72" />
        <div className="skeleton h-4 w-80" />
      </div>

      {/* Featured stat skeleton */}
      <div className="card-dark overflow-hidden p-7">
        <div className="skeleton h-2 w-28" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="skeleton mt-3 h-12 w-48" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* Compact stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-2 w-16" />
            <div className="skeleton mt-2.5 h-7 w-14" />
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="skeleton h-56 w-full" />
      </div>
    </div>
  );
}

export function InlineSkeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        background: "var(--danger-soft)",
        border: "1px solid #fecaca",
        color: "var(--danger)",
      }}
    >
      {message}
    </div>
  );
}
