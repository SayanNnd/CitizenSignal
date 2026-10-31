/**
 * Single priority formula — used by every endpoint that returns issues.
 * Weights live here; tune once seed data is in.
 *
 *   priority = 2*upvotes + 1*evidence_count + 5*recurrence_count + 1.5*days_open
 *
 * days_open counts from created_at, or reopened_at if reopened; 0 when resolved.
 */

interface PriorityInput {
  upvotes: number;
  evidence_count: number;
  recurrence_count: number;
  status: string;
  created_at: string;
  reopened_at: string | null;
}

export function computePriority(issue: PriorityInput): { priority: number; days_open: number } {
  let days_open = 0;
  if (issue.status !== 'resolved') {
    const from = new Date(issue.reopened_at ?? issue.created_at).getTime();
    days_open = (Date.now() - from) / (1000 * 60 * 60 * 24);
  }

  const priority =
    2 * issue.upvotes +
    1 * issue.evidence_count +
    5 * issue.recurrence_count +
    1.5 * days_open;

  return { priority, days_open };
}
