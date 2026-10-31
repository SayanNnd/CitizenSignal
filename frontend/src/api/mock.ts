import type { Candidate, Category, Comment, Evidence, Issue, MyIssue, MyRole, ReportResponse, Status } from '../types';

/**
 * In-memory fixtures that follow the §4 contract exactly. Issues are stored as offsets from
 * an anchor point and re-anchored on every list call, so they always appear around whatever
 * area the app is showing (the user's GPS fix or a searched locality).
 */
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

type Stored = Omit<Issue, 'latitude' | 'longitude' | 'priority' | 'days_open' | 'comment_count'> & { dLat: number; dLng: number };

const store: Stored[] = [
  {
    id: '11111111-1111-1111-1111-111111111111', category: 'pothole', title: 'Pothole: Large pothole near junction',
    description: 'Large pothole causing serious vehicle damage near the junction', dLat: 0.0004, dLng: 0.0002,
    status: 'resolved', image_url: null, upvotes: 8, evidence_count: 3, recurrence_count: 0,
    created_at: ago(14), resolved_at: ago(7), reopened_at: null, has_upvoted: false,
  },
  {
    id: '22222222-2222-2222-2222-222222222222', category: 'pothole', title: 'Pothole: Deep pothole on main road',
    description: 'Deep pothole on main road causing traffic slowdown', dLat: -0.0021, dLng: 0.0014,
    status: 'open', image_url: null, upvotes: 5, evidence_count: 2, recurrence_count: 1,
    created_at: ago(3), resolved_at: ago(2), reopened_at: ago(1), has_upvoted: false,
  },
  {
    id: '33333333-3333-3333-3333-333333333333', category: 'streetlight', title: 'Streetlight: Broken streetlight',
    description: 'Broken streetlight making the lane completely dark at night', dLat: 0.0031, dLng: -0.0018,
    status: 'open', image_url: null, upvotes: 3, evidence_count: 1, recurrence_count: 0,
    created_at: ago(2), resolved_at: null, reopened_at: null, has_upvoted: false,
  },
  {
    id: '44444444-4444-4444-4444-444444444444', category: 'garbage', title: 'Garbage: Overflowing garbage bin',
    description: 'Overflowing garbage bin not cleared in two weeks causing foul smell', dLat: -0.0034, dLng: -0.0027,
    status: 'open', image_url: null, upvotes: 12, evidence_count: 4, recurrence_count: 2,
    created_at: ago(14), resolved_at: null, reopened_at: null, has_upvoted: false,
  },
  {
    id: '55555555-5555-5555-5555-555555555555', category: 'water_leak', title: 'Water Leak: Pipe leaking onto road',
    description: 'Water pipe leaking onto the road since morning, flooding the bike lane', dLat: 0.0012, dLng: 0.0041,
    status: 'open', image_url: null, upvotes: 6, evidence_count: 2, recurrence_count: 0,
    created_at: ago(1), resolved_at: null, reopened_at: null, has_upvoted: false,
  },
  {
    id: '66666666-6666-6666-6666-666666666666', category: 'drainage', title: 'Drainage: Blocked storm drain',
    description: 'Storm drain blocked by plastic waste, water collects after every rain', dLat: -0.0009, dLng: -0.0042,
    status: 'resolved', image_url: null, upvotes: 4, evidence_count: 2, recurrence_count: 1,
    created_at: ago(20), resolved_at: ago(5), reopened_at: null, has_upvoted: false,
  },
  {
    id: '77777777-7777-7777-7777-777777777777', category: 'road_damage', title: 'Road Damage: Cracked road edge',
    description: 'Road edge cracked and crumbling near the bus stop', dLat: 0.0023, dLng: 0.0029,
    status: 'open', image_url: null, upvotes: 2, evidence_count: 1, recurrence_count: 0,
    created_at: ago(6), resolved_at: null, reopened_at: null, has_upvoted: false,
  },
];

const evidenceStore: Record<string, Evidence[]> = {
  '11111111-1111-1111-1111-111111111111': [
    { id: 'e1', issue_id: '11111111-1111-1111-1111-111111111111', description: 'Still there this morning, got worse after the rain.', image_url: null, latitude: 0, longitude: 0, created_at: ago(9) },
    { id: 'e2', issue_id: '11111111-1111-1111-1111-111111111111', description: 'A scooter almost slipped here yesterday.', image_url: null, latitude: 0, longitude: 0, created_at: ago(12) },
  ],
  '22222222-2222-2222-2222-222222222222': [
    { id: 'e4', issue_id: '22222222-2222-2222-2222-222222222222', description: 'It is back. The patch broke up after one day of rain.', image_url: null, latitude: 0, longitude: 0, created_at: ago(1) },
  ],
  '44444444-4444-4444-4444-444444444444': [
    { id: 'e3', issue_id: '44444444-4444-4444-4444-444444444444', description: 'Bin has not been emptied for two weeks now.', image_url: null, latitude: 0, longitude: 0, created_at: ago(2) },
  ],
};

const c = (id: string, issue_id: string, author: string, body: string, days: number): Comment => ({
  id, issue_id, author, body, created_at: new Date(Date.now() - days * DAY).toISOString(), is_mine: false,
});

const commentStore: Record<string, Comment[]> = {
  '22222222-2222-2222-2222-222222222222': [
    c('c1', '22222222-2222-2222-2222-222222222222', 'Meera K.', 'Hit this on my bike yesterday. The edge is sharp, someone will get hurt.', 2),
    c('c2', '22222222-2222-2222-2222-222222222222', 'Arjun', 'Ward office said they would patch it on Monday. Let us see.', 1),
    c('c3', '22222222-2222-2222-2222-222222222222', 'Sana R.', 'Added a photo from this morning. It has widened since last week.', 0.2),
  ],
  '44444444-4444-4444-4444-444444444444': [
    c('c4', '44444444-4444-4444-4444-444444444444', 'Dev P.', 'Third time this has overflowed. Collection trucks skip this lane.', 5),
    c('c5', '44444444-4444-4444-4444-444444444444', 'Ishita', 'The smell is unbearable near the school gate.', 1),
  ],
  '11111111-1111-1111-1111-111111111111': [
    c('c6', '11111111-1111-1111-1111-111111111111', 'Rohan', 'Fixed last week, thanks everyone. Surface looks fresh.', 6),
  ],
  '33333333-3333-3333-3333-333333333333': [
    c('c7', '33333333-3333-3333-3333-333333333333', 'Neha S.', 'The whole lane is dark after 7pm. Unsafe for walking.', 1),
  ],
};

let anchor = { latitude: 28.6139, longitude: 77.209 };

/** Same formula as backend `priority.service.ts` (roadmap §7). */
function hydrate(s: Stored): Issue {
  const { dLat, dLng, ...rest } = s;
  const since = s.reopened_at ?? s.created_at;
  // Real API returns days_open as a whole number and priority rounded to 1 decimal.
  const days_open = s.status === 'resolved' ? 0 : Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / DAY));
  const priority = Math.round((2 * s.upvotes + s.evidence_count + 5 * s.recurrence_count + 1.5 * days_open) * 10) / 10;
  const comment_count = (commentStore[s.id] ?? []).length;
  return { ...rest, latitude: anchor.latitude + dLat, longitude: anchor.longitude + dLng, priority, days_open, comment_count };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const byPriority = (a: Issue, b: Issue) => b.priority - a.priority;

function field(fd: FormData, key: string): string | undefined {
  const parts: [string, unknown][] = (fd as any)._parts ?? (fd as any).getParts?.().map((p: any) => [p.fieldName, p.string]) ?? [];
  const hit = parts.find(([k]) => k === key);
  return hit ? String(hit[1]) : undefined;
}

export async function mockListIssues(lat: number, lng: number, status?: Status): Promise<{ issues: Issue[] }> {
  await wait(300);
  anchor = { latitude: lat, longitude: lng };
  return { issues: store.filter((i) => !status || i.status === status).map(hydrate).sort(byPriority) };
}

export async function mockGetIssue(id: string): Promise<{ issue: Issue; evidence: Evidence[] }> {
  await wait(200);
  const s = store.find((i) => i.id === id);
  if (!s) throw new Error('Not found');
  return { issue: hydrate(s), evidence: evidenceStore[id] ?? [] };
}

/** Issues the (mock) user reported or contributed evidence to, newest own activity first. */
const mine: Record<string, { role: MyRole; at: number }> = {
  '22222222-2222-2222-2222-222222222222': { role: 'reporter', at: Date.now() - 3 * DAY },
  '11111111-1111-1111-1111-111111111111': { role: 'contributor', at: Date.now() - 9 * DAY },
};

function markMine(id: string, role: MyRole) {
  const prev = mine[id];
  // reporting an issue stays "reporter" even if the same user adds more evidence later
  mine[id] = { role: prev?.role === 'reporter' ? 'reporter' : role, at: Date.now() };
}

export async function mockListMyIssues(): Promise<{ issues: MyIssue[] }> {
  await wait(300);
  const issues = Object.entries(mine)
    .sort(([, a], [, b]) => b.at - a.at)
    .flatMap(([id, m]) => {
      const s = store.find((i) => i.id === id);
      return s ? [{ ...hydrate(s), my_role: m.role }] : [];
    });
  return { issues };
}

export async function mockSetUpvote(id: string, value: boolean): Promise<{ issue: Issue }> {
  await wait(150);
  const s = store.find((i) => i.id === id);
  if (!s) throw new Error('Not found');
  if (s.has_upvoted !== value) {
    s.has_upvoted = value;
    s.upvotes += value ? 1 : -1;
  }
  return { issue: hydrate(s) };
}

/** With mock auth, any email starting with "admin@" logs in as an admin. */
export function isMockAdmin(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().startsWith('admin@');
}

/** Same rules as the server: closing sets `resolved_at`; reopening clears it and leaves `recurrence_count`. */
export async function mockSetStatus(id: string, status: Status): Promise<{ issue: Issue }> {
  await wait(200);
  const s = store.find((i) => i.id === id);
  if (!s) throw new Error('Not found');
  if (s.status !== status) {
    s.status = status;
    s.resolved_at = status === 'resolved' ? new Date().toISOString() : null;
  }
  return { issue: hydrate(s) };
}

function titleFor(category: Category, description: string) {
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const words = description.trim().split(/\s+/);
  return `${label}: ${words.slice(0, 6).join(' ')}${words.length > 6 ? '…' : ''}`;
}

/**
 * Mimics the matching pipeline so every outcome can be seen in the UI:
 * same-category issue nearby to needs_confirmation; confirming a resolved one to reopened;
 * confirming an open one to merged; force_new or no match to created.
 */
export async function mockReportIssue(fd: FormData): Promise<ReportResponse> {
  await wait(500);
  const category = (field(fd, 'category') ?? 'other') as Category;
  const description = field(fd, 'description') ?? '';
  const latitude = Number(field(fd, 'latitude'));
  const longitude = Number(field(fd, 'longitude'));
  const confirmId = field(fd, 'confirm_issue_id');
  const forceNew = field(fd, 'force_new') === 'true';

  if (confirmId) {
    const s = store.find((i) => i.id === confirmId);
    if (!s) throw new Error('Not found');
    const wasResolved = s.status === 'resolved';
    s.evidence_count += 1;
    if (wasResolved) {
      s.status = 'open';
      s.reopened_at = new Date().toISOString();
      s.recurrence_count += 1;
    }
    (evidenceStore[s.id] ??= []).unshift({
      id: `e-${Date.now()}`, issue_id: s.id, description, image_url: null, latitude, longitude, created_at: new Date().toISOString(),
    });
    markMine(s.id, 'contributor');
    return { outcome: wasResolved ? 'reopened' : 'merged', issue: hydrate(s) };
  }

  if (!forceNew) {
    const same = store.filter((i) => i.category === category);
    if (same.length) {
      const candidates: Candidate[] = same.slice(0, 3).map((s, n) => ({
        ...hydrate(s), text_score: 0.64 - n * 0.05, distance_m: 18 + n * 14,
      }));
      return { outcome: 'needs_confirmation', issue: candidates[0], candidates };
    }
  }

  const created: Stored = {
    id: `mock-${Date.now()}`, category, title: titleFor(category, description), description,
    dLat: latitude - anchor.latitude, dLng: longitude - anchor.longitude, status: 'open', image_url: null,
    upvotes: 0, evidence_count: 1, recurrence_count: 0, created_at: new Date().toISOString(),
    resolved_at: null, reopened_at: null, has_upvoted: false,
  };
  store.push(created);
  markMine(created.id, 'reporter');
  return { outcome: 'created', issue: hydrate(created) };
}

export async function mockListComments(issueId: string): Promise<{ comments: Comment[] }> {
  await wait(250);
  const list = [...(commentStore[issueId] ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { comments: list };
}

export async function mockAddComment(issueId: string, body: string): Promise<{ comment: Comment }> {
  await wait(250);
  if (!store.some((i) => i.id === issueId)) throw new Error('Not found');
  const comment: Comment = {
    id: `c-${Date.now()}`, issue_id: issueId, author: 'You', body, created_at: new Date().toISOString(), is_mine: true,
  };
  (commentStore[issueId] ??= []).push(comment);
  return { comment };
}
