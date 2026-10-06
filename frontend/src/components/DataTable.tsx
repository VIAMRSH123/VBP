import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight } from "./icons";

export interface Column<T> {
  key: string;
  header: string;
  numeric?: boolean;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  /** Render without its own card border (when nested inside a padded card). */
  bare?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  pageSize = 10,
  bare = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const getValue = column.sortValue;
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => direction * compare(getValue(a), getValue(b)));
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      return prev.dir === "asc" ? { key, dir: "desc" } : null;
    });
  }

  function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  }

  const shell = bare ? "" : "card overflow-hidden";

  if (rows.length === 0) {
    return (
      <div className={shell}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="overflow-x-auto">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
                return (
                  <th key={column.key} scope="col" className={column.numeric ? "is-num" : undefined} aria-sort={column.sortValue ? ariaSort : undefined}>
                    {column.sortValue ? (
                      <button type="button" className="sort-btn" data-active={active} onClick={() => toggleSort(column.key)}>
                        {column.header}
                        <span className="inline-flex w-3 justify-center" aria-hidden="true">
                          {active && (sort.dir === "asc" ? <IconArrowUp width={11} height={11} /> : <IconArrowDown width={11} height={11} />)}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                data-clickable={onRowClick ? "" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => handleRowKey(e, row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap ${column.numeric ? "is-num" : ""}`}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t px-3.5 py-2" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs tabular-nums" style={{ color: "var(--ink-tertiary)" }}>
            {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" className="icon-btn" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} style={{ opacity: currentPage === 0 ? 0.4 : 1 }}>
              <IconChevronLeft width={14} height={14} />
            </button>
            <span className="min-w-12 text-center text-xs tabular-nums" style={{ color: "var(--ink-secondary)" }}>
              {currentPage + 1} / {pageCount}
            </span>
            <button type="button" className="icon-btn" aria-label="Next page" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} style={{ opacity: currentPage >= pageCount - 1 ? 0.4 : 1 }}>
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
