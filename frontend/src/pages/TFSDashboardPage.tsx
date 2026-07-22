import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { RepFilterSelect } from "../components/RepFilterSelect";
import { OverviewTab } from "./dashboard-tabs/OverviewTab";
import { EngagementTab } from "./dashboard-tabs/EngagementTab";
import { WonTab } from "./dashboard-tabs/WonTab";
import { LostTab } from "./dashboard-tabs/LostTab";
import { RepPerformanceTab } from "./dashboard-tabs/RepPerformanceTab";
import { UnassignedTab } from "./dashboard-tabs/UnassignedTab";

type TabKey = "overview" | "engagement" | "won" | "lost" | "rep_performance" | "unassigned";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "engagement", label: "Engagement" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "rep_performance", label: "Rep Performance" },
  { key: "unassigned", label: "Unassigned" },
];

export function TFSDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [representativeId, setRepresentativeId] = useState("");
  const user = useAuthStore((s) => s.user);
  const isRep = user?.role === "sales_representative";

  // Sales reps are always scoped to themselves — the backend enforces this regardless.
  const effectiveRepId = isRep ? user.representative_id ?? "" : representativeId;
  // Unassigned leads have no rep, and Rep Performance is a cross-rep comparison — both are
  // manager/admin/executive-only (backend enforces this too; hide them here so reps don't hit
  // a 403 by clicking a tab they were never meant to see).
  const visibleTabs = isRep ? TABS.filter((tab) => tab.key !== "unassigned" && tab.key !== "rep_performance") : TABS;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="glass-tab-bar">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`glass-tab ${activeTab === tab.key ? "glass-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <RepFilterSelect value={representativeId} onChange={setRepresentativeId} />
      </div>

      {activeTab === "overview" && <OverviewTab representativeId={effectiveRepId} />}
      {activeTab === "engagement" && <EngagementTab representativeId={effectiveRepId} />}
      {activeTab === "won" && <WonTab representativeId={effectiveRepId} />}
      {activeTab === "lost" && <LostTab representativeId={effectiveRepId} />}
      {activeTab === "rep_performance" && !isRep && <RepPerformanceTab representativeId={effectiveRepId} />}
      {activeTab === "unassigned" && !isRep && <UnassignedTab />}
    </div>
  );
}
