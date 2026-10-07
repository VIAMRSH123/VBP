import type { BadgeTone } from "../components/StatusBadge";

interface LeadOrigin {
  source: string;
  external_system: string;
}

/** Human label and badge tone for where a lead came from; demo SAP data is called out as such. */
export function leadSource(lead: LeadOrigin): { label: string; tone: BadgeTone } {
  if (lead.source === "sap") {
    return lead.external_system.endsWith("_mock") ? { label: "SAP (demo)", tone: "warning" } : { label: "SAP", tone: "info" };
  }
  if (lead.source === "whatsapp") return { label: "WhatsApp", tone: "neutral" };
  return { label: lead.source || "Manual", tone: "neutral" };
}

export const SOURCE_FILTERS = [
  { value: "sap", label: "SAP" },
  { value: "whatsapp", label: "WhatsApp (legacy)" },
] as const;
