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
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  reopened_at: string | null;
  // computed at read time
  priority: number;
  days_open: number;
  has_upvoted: boolean;
}

export interface Evidence {
  id: string;
  issue_id: string;
  description: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  created_by: string | null;
  created_at: string;
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
