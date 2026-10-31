/**
 * Single priority formula — used by every endpoint that returns issues.
 * Weights live here; tune once seed data is in.
 *
 *   priority = 2*upvotes + 1*evidence_count + 5*recurrence_count + 1.5*days_open
 *
 * days_open counts whole days from created_at, or reopened_at if reopened; 0 when resolved.
 */

const WEIGHTS = {
  upvotes: 2,
  evidence_count: 1,
  recurrence_count: 5,
  days_open: 1.5,
} as const;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface PriorityInput {
  upvotes: number;
  evidence_count: number;
  recurrence_count: number;
  status: string;
  created_at: string;
  reopened_at: string | null;
}

export function computePriority(
  issue: PriorityInput,
  now: number = Date.now(),
): { priority: number; days_open: number } {
  let days_open = 0;
  if (issue.status !== 'resolved') {
    const from = new Date(issue.reopened_at ?? issue.created_at).getTime();
    days_open = Math.max(0, Math.floor((now - from) / MS_PER_DAY));
  }

  const raw =
    WEIGHTS.upvotes * issue.upvotes +
    WEIGHTS.evidence_count * issue.evidence_count +
    WEIGHTS.recurrence_count * issue.recurrence_count +
    WEIGHTS.days_open * days_open;

  return { priority: Math.round(raw * 10) / 10, days_open };
}
