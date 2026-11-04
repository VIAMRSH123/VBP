import { useMemo } from "react";

const PIECES = 26;
const COLORS = ["#f59e0b", "#fbbf24", "#22c55e", "#2563eb", "#fafafa"];

/** One-shot burst; remount it (change `key`) to fire again. Purely decorative. */
export function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        id: i,
        dx: `${(Math.random() - 0.5) * 220}px`,
        dy: `${40 + Math.random() * 160}px`,
        rot: `${(Math.random() - 0.5) * 720}deg`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 80}ms`,
      })),
    [],
  );
  return (
    <div className="pipe-confetti" aria-hidden="true">
      <span className="pipe-sweep" />
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{ background: p.color, animationDelay: p.delay, ["--dx" as string]: p.dx, ["--dy" as string]: p.dy, ["--rot" as string]: p.rot }}
        />
      ))}
    </div>
  );
}
