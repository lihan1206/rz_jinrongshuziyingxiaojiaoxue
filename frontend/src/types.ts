export type RoleType = "teacher" | "student";

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  role: RoleType;
}

export interface AuthResult {
  access_token: string;
  token_type: string;
  profile: UserProfile;
}

export interface DashboardSummary {
  article_count: number;
  task_count: number;
  submission_count: number;
  reviewed_count: number;
  avg_score: number;
  campaign_count: number;
  sent_size: number;
  convert_size: number;
}

export interface ArticleRow {
  id: number;
  title: string;
  category: string;
  brief: string;
  body_text: string;
  video_link: string | null;
  creator_name: string;
  created_at: string;
}

export interface TaskRow {
  id: number;
  title: string;
  scene: string;
  intro: string;
  demand_text: string;
  rubric: string;
  due_at: string;
  owner_name: string;
  total_submit: number;
  created_at: string;
}

export interface SubmissionRow {
  id: number;
  task_id: number;
  task_title: string;
  student_name: string;
  summary_text: string;
  attach_url: string | null;
  score: number | null;
  teacher_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface CampaignRow {
  id: number;
  name: string;
  channel: string;
  segment: string;
  product_name: string;
  message_body: string;
  landing_title: string;
  landing_copy: string;
  ab_mode: string;
  status: string;
  sent_size: number;
  open_size: number;
  click_size: number;
  convert_size: number;
  owner_name: string;
  created_at: string;
  launched_at: string | null;
}

