import { createContext, useContext } from "react";
import type { Iso } from "./iso";

export const IsoContext = createContext<Iso | null>(null);

export function useIso(): Iso {
  const iso = useContext(IsoContext);
  if (!iso) throw new Error("useIso must be used inside the warehouse scene");
  return iso;
}
