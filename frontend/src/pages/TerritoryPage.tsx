import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTerritories } from "../api/dashboard";
import { listLeads } from "../api/leads";
import { CountUp } from "../components/CountUp";
import { KpiTile } from "../components/KpiTile";
import { ErrorBanner, PageSkeleton } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { formatCompactCurrency } from "../lib/format";
import { RAMP_CSS } from "./territory/colors";
import { regionFor } from "./territory/geo";
import { QatarMap } from "./territory/QatarMap";
import { LiveFeed, TerritoryDetails } from "./territory/TerritoryDetails";
import { useLeadPings } from "./territory/useLeadPings";
import "./territory/territory.css";

const TERRITORY_REFRESH_MS = 30_000;
const RADAR_REFRESH_MS = 10_000;
const RADAR_LEADS = 20;

export function TerritoryPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const territories = useQuery({ queryKey: ["territories"], queryFn: getTerritories, refetchInterval: TERRITORY_REFRESH_MS });
  const radar = useQuery({
    queryKey: ["radar-leads"],
    queryFn: () => listLeads({ limit: RADAR_LEADS }),
    refetchInterval: RADAR_REFRESH_MS,
  });

  const leads = radar.data?.items;
  const pings = useLeadPings(leads);

  // A new lead changes the per-territory numbers, so refresh them straight away rather than on the next poll.
  useEffect(() => {
    if (pings.length > 0) void queryClient.invalidateQueries({ queryKey: ["territories"] });
  }, [pings.length, queryClient]);

  const { drawn, other, totals } = useMemo(() => {
    const byRegion: Record<string, NonNullable<typeof territories.data>[number]> = {};
    const rest: NonNullable<typeof territories.data> = [];
    const sum = { leads: 0, active: 0, won: 0, lost: 0, pipeline_value: 0 };
    for (const row of territories.data ?? []) {
      const region = regionFor(row.territory);
      if (region) byRegion[region] = row;
      else rest.push(row);
      sum.leads += row.leads;
      sum.active += row.active;
      sum.won += row.won;
      sum.lost += row.lost;
      sum.pipeline_value += row.pipeline_value;
    }
    return { drawn: byRegion, other: rest, totals: sum };
  }, [territories.data]);

  const maxPipeline = Math.max(0, ...Object.values(drawn).map((r) => r.pipeline_value));

  if (territories.isLoading) return <PageSkeleton />;
  if (territories.isError || !territories.data) return <ErrorBanner message="Failed to load territories." />;

  const focus = selected ? drawn[selected] : undefined;
  const onStagePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Territories"
        title="Territory map"
        description="Height shows open pipeline value. Select a region to focus it; new leads ping where they land."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Open pipeline" value={<CountUp value={totals.pipeline_value} format={formatCompactCurrency} />} description="Estimated value of leads that are not yet won, lost or archived." featured />
        <KpiTile label="Leads" value={<CountUp value={totals.leads} />} description="Every lead in view, across all territories." />
        <KpiTile label="Active" value={<CountUp value={totals.active} />} description="Leads still open." />
        <KpiTile label="Won" value={<CountUp value={totals.won} />} description="Leads closed as won." tone="success" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="terr-stage" onPointerMove={onStagePointerMove}>
          <QatarMap stats={drawn} selected={selected} hovered={hovered} pings={pings} onSelect={setSelected} onHover={setHovered} />
          <p className="terr-badge">Open pipeline by territory</p>
          <span className="terr-compass" aria-hidden="true">N</span>
          <div className="terr-legend" aria-hidden="true">
            <span>Pipeline value</span>
            <div className="terr-legend__bar" style={{ background: RAMP_CSS }} />
            <div className="terr-legend__scale">
              <span>$0</span>
              <span>{formatCompactCurrency(maxPipeline)}</span>
            </div>
            <span className="mt-1 block opacity-70">Stylised map, not to scale</span>
          </div>
          {hovered && (
            <div className="terr-tip" role="presentation">
              <p className="terr-tip__name">{hovered}</p>
              <p className="terr-tip__value">{formatCompactCurrency(drawn[hovered]?.pipeline_value ?? 0)}</p>
              <p className="terr-tip__meta">
                {drawn[hovered]?.leads ?? 0} leads · {drawn[hovered]?.active ?? 0} active · {drawn[hovered]?.won ?? 0} won
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <TerritoryDetails
            title={selected ?? "All territories"}
            stat={focus ?? totals}
            viewLeadsTo={selected ? `/leads?territory=${encodeURIComponent(selected)}` : "/leads"}
          />
          {other.length > 0 && (
            <div className="card p-4">
              <p className="eyebrow">Not on the map</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {other.map((row) => (
                  <li key={row.territory} className="badge badge--neutral">
                    {row.territory} · {row.leads}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <LiveFeed leads={leads ?? []} pings={pings} />
        </div>
      </div>
    </div>
  );
}
