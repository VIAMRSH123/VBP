/** Mirror of STATUS_TRANSITIONS in backend/app/services/lead_service.py — keep the two in sync. */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Assigned", "Archived"],
  Assigned: ["Contacted", "Archived"],
  Contacted: ["Qualified", "Lost", "Archived"],
  Qualified: ["Quote Requested", "Lost", "Archived"],
  "Quote Requested": ["Quote Sent", "Lost", "Archived"],
  "Quote Sent": ["Negotiation", "Won", "Lost", "Archived"],
  Negotiation: ["Awaiting Customer", "Won", "Lost", "Archived"],
  "Awaiting Customer": ["Negotiation", "Won", "Lost", "Archived"],
  Won: ["Archived"],
  Lost: ["Archived"],
  Archived: [],
};

export function canMove(from: string, to: string): boolean {
  return from !== to && (STATUS_TRANSITIONS[from] ?? []).includes(to);
}
