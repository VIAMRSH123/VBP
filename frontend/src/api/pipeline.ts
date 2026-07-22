import { apiClient } from "./client";

export interface DlqEntry {
  id: string;
  execution_id: string;
  workflow_name: string;
  stage: string;
  error_details: string;
  created_at: string;
}

export async function listDeadLetterQueue(): Promise<DlqEntry[]> {
  const { data } = await apiClient.get<DlqEntry[]>("/api/pipeline/dead-letter-queue");
  return data;
}

export async function replayDlqEntry(id: string): Promise<{ new_execution_id: string; status: string }> {
  const { data } = await apiClient.post(`/api/pipeline/dead-letter-queue/${id}/replay`);
  return data;
}
