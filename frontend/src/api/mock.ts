import type { Issue, ReportResponse } from '../types';

export const MOCK_ISSUES: Issue[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    category: 'pothole',
    title: 'Pothole: Large pothole near junction',
    description: 'Large pothole causing serious vehicle damage near the junction',
    latitude: 28.6139,
    longitude: 77.209,
    status: 'resolved',
    image_url: null,
    upvotes: 8,
    evidence_count: 3,
    recurrence_count: 0,
    priority: 22,
    days_open: 0,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    resolved_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    reopened_at: null,
    has_upvoted: false,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    category: 'pothole',
    title: 'Pothole: Deep pothole on main road',
    description: 'Deep pothole on main road causing traffic slowdown',
    latitude: 28.614,
    longitude: 77.2091,
    status: 'open',
    image_url: null,
    upvotes: 5,
    evidence_count: 2,
    recurrence_count: 1,
    priority: 25,
    days_open: 3,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    resolved_at: null,
    reopened_at: null,
    has_upvoted: false,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    category: 'streetlight',
    title: 'Streetlight: Broken streetlight',
    description: 'Broken streetlight making the lane completely dark at night',
    latitude: 28.6142,
    longitude: 77.2088,
    status: 'open',
    image_url: null,
    upvotes: 3,
    evidence_count: 1,
    recurrence_count: 0,
    priority: 9,
    days_open: 2,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    resolved_at: null,
    reopened_at: null,
    has_upvoted: false,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    category: 'garbage',
    title: 'Garbage: Overflowing garbage bin',
    description: 'Overflowing garbage bin not cleared in two weeks causing foul smell',
    latitude: 28.6135,
    longitude: 77.2093,
    status: 'open',
    image_url: null,
    upvotes: 12,
    evidence_count: 4,
    recurrence_count: 2,
    priority: 45,
    days_open: 14,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    resolved_at: null,
    reopened_at: null,
    has_upvoted: false,
  },
];

export async function mockListIssues(): Promise<{ issues: Issue[] }> {
  await new Promise((r) => setTimeout(r, 300));
  return { issues: MOCK_ISSUES };
}

export async function mockGetIssue(id: string): Promise<{ issue: Issue; evidence: [] }> {
  await new Promise((r) => setTimeout(r, 200));
  const issue = MOCK_ISSUES.find((i) => i.id === id);
  if (!issue) throw new Error('Not found');
  return { issue, evidence: [] };
}

export async function mockReportIssue(): Promise<ReportResponse> {
  await new Promise((r) => setTimeout(r, 500));
  return { outcome: 'created', issue: MOCK_ISSUES[0] };
}

