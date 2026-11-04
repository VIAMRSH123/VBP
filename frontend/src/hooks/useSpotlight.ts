import { useCallback, type PointerEvent } from "react";

/** Spreads onto an element styled with `.spotlight` to feed the cursor position to its radial highlight. */
export function useSpotlight() {
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);
  return { onPointerMove };
}
