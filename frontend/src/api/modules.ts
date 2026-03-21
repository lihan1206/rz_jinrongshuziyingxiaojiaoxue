import http from "./http";
import type {
  ArticleRow,
  AuthResult,
  CampaignRow,
  DashboardSummary,
  SubmissionRow,
  TaskRow,
  UserProfile,
} from "../types";

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    http.post<AuthResult>("/auth/login", payload).then((res) => res.data),
  register: (payload: { username: string; password: string; full_name: string; role: "teacher" | "student" }) =>
    http.post<AuthResult>("/auth/register", payload).then((res) => res.data),
  me: () => http.get<UserProfile>("/auth/me").then((res) => res.data),
};

export const dashApi = {
  overview: () => http.get<DashboardSummary>("/dashboard/overview").then((res) => res.data),
};

export const contentApi = {
  list: () => http.get<ArticleRow[]>("/contents").then((res) => res.data),
  create: (payload: Omit<ArticleRow, "id" | "creator_name" | "created_at">) =>
    http.post<ArticleRow>("/contents", payload).then((res) => res.data),
  update: (id: number, payload: Omit<ArticleRow, "id" | "creator_name" | "created_at">) =>
    http.put<ArticleRow>(`/contents/${id}`, payload).then((res) => res.data),
  remove: (id: number) => http.delete(`/contents/${id}`).then((res) => res.data),
};

export const taskApi = {
  list: () => http.get<TaskRow[]>("/tasks").then((res) => res.data),
  create: (payload: Omit<TaskRow, "id" | "created_at" | "owner_name" | "total_submit">) =>
    http.post<TaskRow>("/tasks", payload).then((res) => res.data),
  update: (id: number, payload: Omit<TaskRow, "id" | "created_at" | "owner_name" | "total_submit">) =>
    http.put<TaskRow>(`/tasks/${id}`, payload).then((res) => res.data),
  remove: (id: number) => http.delete(`/tasks/${id}`).then((res) => res.data),
  submit: (taskId: number, payload: { summary_text: string; attach_url?: string | null }) =>
    http.post<SubmissionRow>(`/tasks/${taskId}/submit`, payload).then((res) => res.data),
  mineSubmits: () => http.get<SubmissionRow[]>("/tasks/mine/submissions").then((res) => res.data),
  allSubmits: () => http.get<SubmissionRow[]>("/tasks/all/submissions").then((res) => res.data),
  review: (id: number, payload: { score: number; teacher_note: string }) =>
    http.put<SubmissionRow>(`/tasks/submissions/${id}/review`, payload).then((res) => res.data),
};

export const campaignApi = {
  list: () => http.get<CampaignRow[]>("/campaigns").then((res) => res.data),
  create: (payload: Omit<CampaignRow, "id" | "status" | "sent_size" | "open_size" | "click_size" | "convert_size" | "owner_name" | "created_at" | "launched_at">) =>
    http.post<CampaignRow>("/campaigns", payload).then((res) => res.data),
  update: (id: number, payload: Omit<CampaignRow, "id" | "status" | "sent_size" | "open_size" | "click_size" | "convert_size" | "owner_name" | "created_at" | "launched_at">) =>
    http.put<CampaignRow>(`/campaigns/${id}`, payload).then((res) => res.data),
  remove: (id: number) => http.delete(`/campaigns/${id}`).then((res) => res.data),
  launch: (id: number) => http.post<CampaignRow>(`/campaigns/${id}/launch`).then((res) => res.data),
  exportLeads: () => http.get("/campaigns/lead/export", { responseType: "blob" }).then((res) => res.data as Blob),
};

export const fileApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post<{ file_name: string; file_url: string }>("/files/upload", fd).then((res) => res.data);
  },
};

