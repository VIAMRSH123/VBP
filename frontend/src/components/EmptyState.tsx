import type { ComponentType, ReactNode, SVGProps } from "react";
import { IconAlert, IconInbox } from "./icons";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export function EmptyState({ title, description, action, icon: Icon = IconInbox }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Icon width={16} height={16} />
      </span>
      <p className="card-title">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="card" role="alert">
      <EmptyState
        icon={IconAlert}
        title={title}
        description={description}
        action={
          onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary">
              Try again
            </button>
          )
        }
      />
    </div>
  );
}
