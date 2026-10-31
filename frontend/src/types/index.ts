export type Category =
  | 'pothole'
  | 'streetlight'
  | 'garbage'
  | 'water_leak'
  | 'drainage'
  | 'road_damage'
  | 'other';

export type Status = 'open' | 'resolved';

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
  priority: number;
  days_open: number;
  created_at: string;
  resolved_at: string | null;
  reopened_at: string | null;
  has_upvoted: boolean;
  comment_count: number;
}

export type MyRole = 'reporter' | 'contributor';

/** GET /issues/mine item: an Issue plus how the caller relates to it (roadmap §4). */
export interface MyIssue extends Issue {
  my_role: MyRole;
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

/** GET/POST /api/issues/:id/comments item (roadmap §4). */
export interface Comment {
  id: string;
  issue_id: string;
  author: string;
  body: string;
  created_at: string;
  is_mine: boolean;
}

export interface Candidate extends Issue {
  text_score: number;
  distance_m: number;
}

export type Outcome = 'created' | 'merged' | 'reopened' | 'needs_confirmation';

export interface ReportResponse {
  outcome: Outcome;
  issue: Issue;
  candidates?: Candidate[];
}

/** `POST /api/auth/login`: signs in, creating the account first if the email is new. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  created: boolean;
  is_admin: boolean;
}

/** `GET /api/auth/me`: who the token belongs to. Admins are the emails in the server's ADMIN_EMAILS. */
export interface Me {
  id: string;
  email: string | null;
  is_admin: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Array<{ field: string; message: string }>;
  };
}

