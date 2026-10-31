import { getDistance } from 'geolib';
import { supabase } from '../config/supabase.js';
import { computePriority } from './priority.service.js';
import { processAndUploadImage } from './image.service.js';
import { findMatches } from './matching.service.js';
import type { Issue, Evidence, Candidate, ReportResponse } from '../types/index.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function withComputed(row: any, has_upvoted = false): Issue {
  const { priority, days_open } = computePriority(row);
  return { ...row, priority, days_open, has_upvoted };
}

function generateTitle(category: string, description: string): string {
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const preview = description.trim().split(/\s+/).slice(0, 6).join(' ');
  return `${label}: ${preview}${description.split(/\s+/).length > 6 ? '…' : ''}`;
}

async function getUpvotedIds(userId: string, issueIds: string[]): Promise<Set<string>> {
  if (!issueIds.length) return new Set();
  const { data } = await supabase
    .from('upvotes')
    .select('issue_id')
    .eq('user_id', userId)
    .in('issue_id', issueIds);
  return new Set((data ?? []).map((r: any) => r.issue_id));
}

async function syncUpvoteCount(issueId: string): Promise<number> {
  const { count } = await supabase
    .from('upvotes')
    .select('*', { count: 'exact', head: true })
    .eq('issue_id', issueId);
  const upvotes = count ?? 0;
  await supabase.from('issues').update({ upvotes }).eq('id', issueId);
  return upvotes;
}

// ── public API ────────────────────────────────────────────────────────────────

export async function getNearbyIssues(
  lat: number,
  lng: number,
  radius_m: number,
  userId?: string,
): Promise<Issue[]> {
  const { data: rows, error } = await supabase.from('issues').select('*');
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const nearby = rows.filter(
    (row) =>
      getDistance({ latitude: lat, longitude: lng }, { latitude: row.latitude, longitude: row.longitude }) <= radius_m,
  );

  const ids = nearby.map((r: any) => r.id);
  const upvotedIds = userId ? await getUpvotedIds(userId, ids) : new Set<string>();

  return nearby
    .map((row) => withComputed(row, upvotedIds.has(row.id)))
    .sort((a, b) => b.priority - a.priority);
}

export async function getIssueById(
  id: string,
  userId?: string,
): Promise<{ issue: Issue; evidence: Evidence[] } | null> {
  const [{ data: row, error }, { data: evidenceRows }] = await Promise.all([
    supabase.from('issues').select('*').eq('id', id).single(),
    supabase.from('evidence').select('*').eq('issue_id', id).order('created_at', { ascending: false }),
  ]);

  if (error || !row) return null;

  let has_upvoted = false;
  if (userId) {
    const { data } = await supabase
      .from('upvotes')
      .select('issue_id')
      .eq('issue_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    has_upvoted = !!data;
  }

  return {
    issue: withComputed(row, has_upvoted),
    evidence: (evidenceRows ?? []) as Evidence[],
  };
}

export async function reportIssue(payload: {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  imageBuffer?: Buffer;
  confirm_issue_id?: string;
  force_new?: boolean;
  userId?: string;
}): Promise<ReportResponse> {
  const { category, description, latitude, longitude, imageBuffer, confirm_issue_id, force_new, userId } = payload;

  // 1. Upload image first (shared by all paths)
  const image_url = imageBuffer ? await processAndUploadImage(imageBuffer) : null;

  // 2. Explicit override: merge into a specified issue
  if (confirm_issue_id) {
    const issue = await mergeEvidence(confirm_issue_id, { description, image_url, latitude, longitude, userId });
    const outcome = issue.status === 'open' && issue.recurrence_count > 0 ? 'reopened' : 'merged';
    return { outcome, issue };
  }

  // 3. Explicit override: force new
  if (force_new) {
    const issue = await createNew({ category, description, latitude, longitude, image_url, userId });
    return { outcome: 'created', issue };
  }

  // 4. Run matching pipeline
  const match = await findMatches(category, description, latitude, longitude);

  if (match.outcome === 'no_match') {
    const issue = await createNew({ category, description, latitude, longitude, image_url, userId });
    return { outcome: 'created', issue };
  }

  if (match.outcome === 'auto_match') {
    const issue = await mergeEvidence(match.row.id, { description, image_url, latitude, longitude, userId }, match.isResolved);
    return { outcome: match.isResolved ? 'reopened' : 'merged', issue };
  }

  // needs_confirmation — save nothing, return candidates
  return { outcome: 'needs_confirmation', issue: match.candidates[0], candidates: match.candidates };
}

async function createNew(data: {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  userId?: string;
}): Promise<Issue> {
  const title = generateTitle(data.category, data.description);
  const { data: row, error } = await supabase
    .from('issues')
    .insert({
      category: data.category,
      title,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      image_url: data.image_url,
      created_by: data.userId ?? null,
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? 'Failed to create issue');
  return withComputed(row);
}

async function mergeEvidence(
  issueId: string,
  payload: {
    description: string;
    image_url: string | null;
    latitude: number;
    longitude: number;
    userId?: string;
  },
  reopen = false,
): Promise<Issue> {
  // Insert evidence row
  await supabase.from('evidence').insert({
    issue_id: issueId,
    description: payload.description,
    image_url: payload.image_url,
    latitude: payload.latitude,
    longitude: payload.longitude,
    created_by: payload.userId ?? null,
  });

  // Build update
  const { data: current } = await supabase.from('issues').select('evidence_count, recurrence_count').eq('id', issueId).single();
  const updates: Record<string, unknown> = {
    evidence_count: (current?.evidence_count ?? 1) + 1,
  };
  if (reopen) {
    updates.status = 'open';
    updates.reopened_at = new Date().toISOString();
    updates.recurrence_count = (current?.recurrence_count ?? 0) + 1;
  }

  const { data: row, error } = await supabase.from('issues').update(updates).eq('id', issueId).select().single();
  if (error || !row) throw new Error(error?.message ?? 'Merge failed');
  return withComputed(row);
}

export async function addUpvote(issueId: string, userId: string): Promise<Issue> {
  const { error } = await supabase.from('upvotes').insert({ issue_id: issueId, user_id: userId });

  // Ignore unique-constraint violations (user already voted) — return current state gracefully
  if (error && !error.message.includes('duplicate') && !error.code?.includes('23505')) {
    throw new Error(error.message);
  }

  const upvotes = await syncUpvoteCount(issueId);
  const { data: row } = await supabase.from('issues').select('*').eq('id', issueId).single();
  if (!row) throw Object.assign(new Error('Issue not found'), { status: 404 });
  return withComputed({ ...row, upvotes }, true);
}

export async function removeUpvote(issueId: string, userId: string): Promise<Issue> {
  await supabase.from('upvotes').delete().eq('issue_id', issueId).eq('user_id', userId);
  const upvotes = await syncUpvoteCount(issueId);
  const { data: row } = await supabase.from('issues').select('*').eq('id', issueId).single();
  if (!row) throw Object.assign(new Error('Issue not found'), { status: 404 });
  return withComputed({ ...row, upvotes }, false);
}
