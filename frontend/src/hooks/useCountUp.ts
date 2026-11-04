import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

const DURATION_MS = 900;

/** Eases a number from its previous value to `target`. Jumps straight there under reduced motion. */
export function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const from = useRef(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return value;
}
