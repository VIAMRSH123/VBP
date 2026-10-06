/** Lead statuses in pipeline order (earliest stage first). */
export const PIPELINE_STATUSES = [
  "New",
  "Assigned",
  "Contacted",
  "Qualified",
  "Quote Requested",
  "Quote Sent",
  "Negotiation",
  "Awaiting Customer",
  "Won",
  "Lost",
  "Archived",
] as const;
