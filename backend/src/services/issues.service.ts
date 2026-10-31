import { getDistance } from 'geolib';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../lib/http-error.js';
import { boundingBox } from '../lib/geo.js';
import { computePriority } from './priority.service.js';
import { deleteImage, processAndUploadImage, UploadedImage } from './image.service.js';
import { findMatches, normalize, ScoredMatch } from './matching.service.js';
import type {
  Candidate,
  Category,
  Evidence,
  EvidenceRow,
  Issue,
  IssueRow,
  MyIssue,
  ReportResponse,
  Status,
} from '../types/index.js';

/** Postgres error code for a unique / primary-key violation. */
const UNIQUE_VIOLATION = '23505';

/** Words of `q` used for search; extra words are ignored. */
const MAX_SEARCH_WORDS = 5;

/** Cap on `GET /issues/mine` results. */
const MAX_MY_ISSUES = 100;

// ── mapping ──────────────────────────────────────────────────────────────────

/** Row → API issue. Whitelists contract fields (drops `created_by`) and adds computed ones. */
function toIssue(row: IssueRow, has_upvoted = false): Issue {
  const { priority, days_open } = computePriority(row);
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    image_url: row.image_url,
    upvotes: row.upvotes,
    evidence_count: row.evidence_count,
    recurrence_count: row.recurrence_count,
    priority,
    days_open,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    reopened_at: row.reopened_at,
    has_upvoted,
  };
}

function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    issue_id: row.issue_id,
    description: row.description,
    image_url: row.image_url,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.created_at,
  };
}

function toCandidate(match: ScoredMatch): Candidate {
  return {
    ...toIssue(match.row),
    text_score: Math.round(match.text_score * 1000) / 1000,
    distance_m: match.distance_m,
  };
}

/** Postgres timestamps vary in fractional digits, so compare parsed times, not strings. */
function toMillis(timestamp: string): number {
  return Date.parse(timestamp);
}

/** Sorts by priority, newest first on ties. */
function byPriority(a: Issue, b: Issue): number {
  return b.priority - a.priority || toMillis(b.created_at) - toMillis(a.created_at);
}

export function generateTitle(category: string, description: string): string {
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const words = description.trim().split(/\s+/);
  const preview = words.slice(0, 6).join(' ');
  return `${label}: ${preview}${words.length > 6 ? '…' : ''}`;
}

// ── data access ──────────────────────────────────────────────────────────────

async function findIssueRow(id: string): Promise<IssueRow | null> {
  const { data, error } = await supabase.from('issues').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Issue lookup failed: ${error.message}`);
  return data as IssueRow | null;
}

async function requireIssueRow(id: string): Promise<IssueRow> {
  const row = await findIssueRow(id);
  if (!row) throw HttpError.notFound('Issue not found');
  return row;
}

async function getUpvotedIds(userId: string, issueIds: string[]): Promise<Set<string>> {
  if (!issueIds.length) return new Set();
  const { data, error } = await supabase
    .from('upvotes')
    .select('issue_id')
    .eq('user_id', userId)
    .in('issue_id', issueIds);
  if (error) throw new Error(`Upvote lookup failed: ${error.message}`);
  return new Set((data ?? []).map((r: { issue_id: string }) => r.issue_id));
}

/** Recounts votes from the `upvotes` table and stores the total on the issue. */
async function syncUpvoteCount(issueId: string): Promise<IssueRow> {
  const { count, error: countError } = await supabase
    .from('upvotes')
    .select('*', { count: 'exact', head: true })
    .eq('issue_id', issueId);
  if (countError) throw new Error(`Upvote count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('issues')
    .update({ upvotes: count ?? 0 })
    .eq('id', issueId)
    .select()
    .single();
  if (error) throw new Error(`Upvote counter update failed: ${error.message}`);
  return data as IssueRow;
}

// ── reads ────────────────────────────────────────────────────────────────────

/**
 * Splits a search string into words. `normalize` keeps only letters, digits and spaces,
 * so the words are safe inside a PostgREST filter and contain no LIKE wildcards.
 */
function searchWords(q: string | undefined): string[] {
  if (!q) return [];
  return normalize(q).split(' ').filter(Boolean).slice(0, MAX_SEARCH_WORDS);
}

export interface NearbyFilters {
  lat: number;
  lng: number;
  radius_m: number;
  /** Every word must appear in the title or description (case-insensitive). */
  q?: string;
  category?: Category;
  status?: Status;
}

export async function getNearbyIssues(filters: NearbyFilters, userId?: string): Promise<Issue[]> {
  const { lat, lng, radius_m } = filters;
  const box = boundingBox(lat, lng, radius_m);
  let query = supabase
    .from('issues')
    .select('*')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.status) query = query.eq('status', filters.status);
  for (const word of searchWords(filters.q)) {
    query = query.or(`title.ilike.%${word}%,description.ilike.%${word}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Issue list failed: ${error.message}`);

  // The box is a square; trim its corners with the exact distance.
  const nearby = ((data ?? []) as IssueRow[]).filter(
    (row) => getDistance({ latitude: lat, longitude: lng }, { latitude: row.latitude, longitude: row.longitude }) <= radius_m,
  );

  const upvoted = userId ? await getUpvotedIds(userId, nearby.map((r) => r.id)) : new Set<string>();
  return nearby.map((row) => toIssue(row, upvoted.has(row.id))).sort(byPriority);
}

/**
 * Issues the caller reported, plus issues their reports were merged into as evidence —
 * otherwise a report that reopened or merged into someone else's issue would vanish
 * from "Your Issues". Newest own activity first.
 */
export async function getMyIssues(userId: string): Promise<MyIssue[]> {
  const [createdResult, evidenceResult] = await Promise.all([
    supabase.from('issues').select('*').eq('created_by', userId).order('created_at', { ascending: false }).limit(MAX_MY_ISSUES),
    supabase
      .from('evidence')
      .select('issue_id, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_MY_ISSUES),
  ]);
  if (createdResult.error) throw new Error(`My issues lookup failed: ${createdResult.error.message}`);
  if (evidenceResult.error) throw new Error(`My evidence lookup failed: ${evidenceResult.error.message}`);

  const created = (createdResult.data ?? []) as IssueRow[];
  const evidence = (evidenceResult.data ?? []) as Pick<EvidenceRow, 'issue_id' | 'created_at'>[];

  // Latest time (ms) the caller touched each issue: their report or their newest evidence.
  const lastActivity = new Map<string, number>();
  for (const row of created) lastActivity.set(row.id, toMillis(row.created_at));
  for (const e of evidence) {
    const at = toMillis(e.created_at);
    if (at > (lastActivity.get(e.issue_id) ?? 0)) lastActivity.set(e.issue_id, at);
  }

  const createdIds = new Set(created.map((r) => r.id));
  const contributedIds = [...new Set(evidence.map((e) => e.issue_id))].filter((id) => !createdIds.has(id));

  let contributed: IssueRow[] = [];
  if (contributedIds.length) {
    const { data, error } = await supabase.from('issues').select('*').in('id', contributedIds);
    if (error) throw new Error(`Contributed issues lookup failed: ${error.message}`);
    contributed = (data ?? []) as IssueRow[];
  }

  const upvoted = await getUpvotedIds(userId, [...lastActivity.keys()]);
  const tag = (row: IssueRow, my_role: MyIssue['my_role']): MyIssue => ({
    ...toIssue(row, upvoted.has(row.id)),
    my_role,
  });

  return [...created.map((r) => tag(r, 'reporter')), ...contributed.map((r) => tag(r, 'contributor'))]
    .sort((a, b) => (lastActivity.get(b.id) ?? 0) - (lastActivity.get(a.id) ?? 0))
    .slice(0, MAX_MY_ISSUES);
}

export async function getIssueById(id: string, userId?: string): Promise<{ issue: Issue; evidence: Evidence[] }> {
  const [row, evidenceResult, upvoted] = await Promise.all([
    requireIssueRow(id),
    supabase.from('evidence').select('*').eq('issue_id', id).order('created_at', { ascending: false }),
    userId ? getUpvotedIds(userId, [id]) : Promise.resolve(new Set<string>()),
  ]);
  if (evidenceResult.error) throw new Error(`Evidence lookup failed: ${evidenceResult.error.message}`);

  return {
    issue: toIssue(row, upvoted.has(id)),
    evidence: ((evidenceResult.data ?? []) as EvidenceRow[]).map(toEvidence),
  };
}

// ── report pipeline ──────────────────────────────────────────────────────────

export interface ReportInput {
  category: Category;
  description: string;
  latitude: number;
  longitude: number;
  photo: Buffer;
  confirm_issue_id?: string;
  force_new: boolean;
  userId?: string;
}

/** What a report will do, decided before anything is written or uploaded. */
type ReportPlan =
  | { action: 'create' }
  | { action: 'merge'; target: IssueRow }
  | { action: 'confirm'; matches: ScoredMatch[] };

async function planReport(input: ReportInput): Promise<ReportPlan> {
  // Step 1: the user already answered the "same issue?" question.
  if (input.confirm_issue_id) return { action: 'merge', target: await requireIssueRow(input.confirm_issue_id) };
  if (input.force_new) return { action: 'create' };

  // Steps 2–7: run the matching pipeline.
  const result = await findMatches(input.category, input.description, input.latitude, input.longitude);
  if (result.kind === 'auto') return { action: 'merge', target: result.match.row };
  if (result.kind === 'candidates') return { action: 'confirm', matches: result.matches };
  return { action: 'create' };
}

/**
 * Handles `POST /issues`. Matching runs first so `needs_confirmation` saves nothing —
 * not even the photo. The photo is only uploaded once we know a row will be written.
 */
export async function reportIssue(input: ReportInput): Promise<ReportResponse> {
  const plan = await planReport(input);

  if (plan.action === 'confirm') {
    const candidates = plan.matches.map(toCandidate);
    return { outcome: 'needs_confirmation', issue: candidates[0], candidates };
  }

  const image = await processAndUploadImage(input.photo);
  try {
    if (plan.action === 'create') {
      return { outcome: 'created', issue: await createIssue(input, image) };
    }
    const reopen = plan.target.status === 'resolved';
    const issue = await addEvidence(plan.target, input, image, reopen);
    return { outcome: reopen ? 'reopened' : 'merged', issue };
  } catch (err) {
    await deleteImage(image.path);
    throw err;
  }
}

async function createIssue(input: ReportInput, image: UploadedImage): Promise<Issue> {
  const { data, error } = await supabase
    .from('issues')
    .insert({
      category: input.category,
      title: generateTitle(input.category, input.description),
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      image_url: image.publicUrl,
      created_by: input.userId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Issue insert failed: ${error.message}`);
  return toIssue(data as IssueRow);
}

/**
 * Attaches the report to an existing issue as evidence and bumps its counters.
 * If the issue was resolved, it is reopened and `recurrence_count` goes up.
 */
async function addEvidence(target: IssueRow, input: ReportInput, image: UploadedImage, reopen: boolean): Promise<Issue> {
  const { data: evidenceRow, error: evidenceError } = await supabase
    .from('evidence')
    .insert({
      issue_id: target.id,
      description: input.description,
      image_url: image.publicUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      created_by: input.userId ?? null,
    })
    .select('id')
    .single();
  if (evidenceError) throw new Error(`Evidence insert failed: ${evidenceError.message}`);

  const updates: Partial<IssueRow> = { evidence_count: target.evidence_count + 1 };
  if (reopen) {
    updates.status = 'open';
    updates.reopened_at = new Date().toISOString();
    updates.recurrence_count = target.recurrence_count + 1;
  }

  const { data, error } = await supabase.from('issues').update(updates).eq('id', target.id).select().single();
  if (error) {
    // Don't leave an evidence row pointing at the photo the caller is about to delete.
    await supabase.from('evidence').delete().eq('id', evidenceRow.id);
    throw new Error(`Issue update failed: ${error.message}`);
  }

  const has_upvoted = input.userId ? (await getUpvotedIds(input.userId, [target.id])).has(target.id) : false;
  return toIssue(data as IssueRow, has_upvoted);
}

// ── upvotes ──────────────────────────────────────────────────────────────────

/** One vote per user per issue, enforced by the (issue_id, user_id) primary key. Idempotent. */
export async function addUpvote(issueId: string, userId: string): Promise<Issue> {
  await requireIssueRow(issueId);

  const { error } = await supabase.from('upvotes').insert({ issue_id: issueId, user_id: userId });
  // Already voted → not an error; just return the current state.
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(`Upvote failed: ${error.message}`);

  return toIssue(await syncUpvoteCount(issueId), true);
}

/** Removes the caller's vote. Idempotent: removing a vote that isn't there is fine. */
export async function removeUpvote(issueId: string, userId: string): Promise<Issue> {
  await requireIssueRow(issueId);

  const { error } = await supabase.from('upvotes').delete().eq('issue_id', issueId).eq('user_id', userId);
  if (error) throw new Error(`Removing upvote failed: ${error.message}`);

  return toIssue(await syncUpvoteCount(issueId), false);
}
