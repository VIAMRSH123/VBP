import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { IconCornerDownLeft, IconSearch } from "./icons";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  /** Builds an extra command from the current query (e.g. "Search leads for …"). */
  queryCommand?: (query: string) => Command;
}

export function CommandPalette({ open, onClose, commands, queryCommand }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q))
      : commands;
    return q && queryCommand ? [queryCommand(query.trim()), ...matched] : matched;
  }, [commands, query, queryCommand]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  if (!open) return null;

  function run(command: Command | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  }

  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="popover relative mx-auto mt-[12vh] w-[min(560px,calc(100vw-2rem))] overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)", transformOrigin: "top center" }}
      >
        <div className="flex items-center gap-2.5 border-b px-3.5" style={{ borderColor: "var(--border)" }}>
          <IconSearch width={15} height={15} style={{ color: "var(--ink-tertiary)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-label="Search pages and actions"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, actions, or leads…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
          <span className="kbd">Esc</span>
        </div>

        <ul id={listId} ref={listRef} role="listbox" className="max-h-[min(360px,50vh)] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-[13px]" style={{ color: "var(--ink-tertiary)" }}>
              No results for “{query}”
            </li>
          )}
          {results.map((command, index) => {
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;
            const Icon = command.icon;
            return (
              <li key={command.id} role="presentation">
                {showGroup && (
                  <p className="eyebrow px-2.5 pb-1 pt-2.5">{command.group}</p>
                )}
                <div
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  className="menu-item cursor-pointer"
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                >
                  <Icon width={15} height={15} style={{ flexShrink: 0 }} />
                  <span className="flex-1 truncate">{command.label}</span>
                  {index === active && <IconCornerDownLeft width={13} height={13} style={{ color: "var(--ink-tertiary)" }} />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
