export const CATEGORIES = [
  'pothole',
  'streetlight',
  'garbage',
  'water_leak',
  'drainage',
  'road_damage',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['open', 'resolved'] as const;

export type Status = (typeof STATUSES)[number];

/** The authenticated caller, taken from a verified Supabase access token. */
export interface AuthUser {
  id: string;
  email?: string;
  /** Public display name for comments: "Meera K." from a profile name, else the email before the @. */
  name: string;
  /** True when the email is listed in `ADMIN_EMAILS` (config/admin.ts). */
  is_admin: boolean;
}

/** A row of the `issues` table as Postgres returns it. */
export interface IssueRow {
  id: string;
  category: Category;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  status: Status;
  image_url: string | null;
  upvotes: number;
  evidence_count: number;
  recurrence_count: number;
  comment_count: number;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  reopened_at: string | null;
}

/** A row of the `evidence` table as Postgres returns it. */
export interface EvidenceRow {
  id: string;
  issue_id: string;
  description: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  created_by: string | null;
  created_at: string;
}

/** A row of the `comments` table as Postgres returns it. */
export interface CommentRow {
  id: string;
  issue_id: string;
  user_id: string;
  author: string;
  body: string;
  created_at: string;
}

// ── API shapes (roadmap.md §4) ───────────────────────────────────────────────

export interface Issue {
  id: string;
  category: Category;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  status: Status;
  image_url: string | null;
  upvotes: number;
  evidence_count: number;
  recurrence_count: number;
  comment_count: number;
  priority: number;
  days_open: number;
  created_at: string;
  resolved_at: string | null;
  reopened_at: string | null;
  has_upvoted: boolean;
}

export interface Evidence {
  id: string;
  issue_id: string;
  description: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

/** An item of `GET /issues/:id/comments`. Drops `user_id`; `is_mine` says whether the caller wrote it. */
export interface Comment {
  id: string;
  issue_id: string;
  author: string;
  body: string;
  created_at: string;
  is_mine: boolean;
}

/**
 * An item of `GET /issues/mine`. `reporter`: the caller created the issue.
 * `contributor`: the caller's report was merged into it as evidence (incl. reopening it).
 */
export interface MyIssue extends Issue {
  my_role: 'reporter' | 'contributor';
}

export interface Candidate extends Issue {
  text_score: number;
  distance_m: number;
}

export type Outcome = 'created' | 'merged' | 'reopened' | 'needs_confirmation';

export interface ReportResponse {
  outcome: Outcome;
  /** For `needs_confirmation` this is the best candidate; nothing was saved. */
  issue: Issue;
  candidates?: Candidate[];
}
