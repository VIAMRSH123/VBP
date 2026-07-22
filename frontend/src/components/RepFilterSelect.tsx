import { useQuery } from "@tanstack/react-query";
import { listRepresentatives } from "../api/representatives";
import { useAuthStore } from "../store/authStore";

interface RepFilterSelectProps {
  value: string;
  onChange: (representativeId: string) => void;
}

export function RepFilterSelect({ value, onChange }: RepFilterSelectProps) {
  const role = useAuthStore((s) => s.user?.role);
  const { data: reps } = useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives });

  // Sales reps only ever see their own data — the backend enforces this too, but hiding
  // the control avoids implying a choice that doesn't exist.
  if (role === "sales_representative") return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass-select px-4 py-2"
    >
      <option value="">All Sales Reps</option>
      {reps?.map((rep) => (
        <option key={rep.id} value={rep.id}>
          {rep.name}
        </option>
      ))}
    </select>
  );
}
