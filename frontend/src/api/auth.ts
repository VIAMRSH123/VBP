import { apiClient } from "./client";
import type { AuthUser } from "../types";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  name: string;
  user_id: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/api/auth/login", { email, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/auth/me");
  return data;
}
