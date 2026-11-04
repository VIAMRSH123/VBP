import { useCountUp } from "../hooks/useCountUp";

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-US") }: CountUpProps) {
  return <>{format(useCountUp(value))}</>;
}
