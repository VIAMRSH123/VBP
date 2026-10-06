import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AXIS_TICK, CHART_ANIMATION_MS, GRID_STROKE } from "../lib/chartColors";
import { ChartTooltip } from "./ChartTooltip";

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  seriesName: string;
}

const ROW_HEIGHT = 34;

/** Horizontal bars: category names sit on the left, so long or numerous labels never overlap or get skipped. */
export function CategoryBarChart({ data, seriesName }: CategoryBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * ROW_HEIGHT + 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          interval={0}
          tick={{ ...AXIS_TICK, fontSize: 12 }}
          axisLine={{ stroke: GRID_STROKE }}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-secondary)" }} />
        <Bar
          dataKey="value"
          name={seriesName}
          fill="var(--chart-1)"
          radius={[0, 4, 4, 0]}
          barSize={14}
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
