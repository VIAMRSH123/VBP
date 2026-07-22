import { apiClient } from "./client";
import type { Representative, CsvUploadResult } from "../types";

export async function listRepresentatives(): Promise<Representative[]> {
  const { data } = await apiClient.get<Representative[]>("/api/representatives");
  return data;
}

export async function uploadRepresentativeCsv(file: File): Promise<CsvUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<CsvUploadResult>("/api/representatives/upload-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
