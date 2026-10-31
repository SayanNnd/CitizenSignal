import { apiFetch } from './client';
import {
  mockListIssues, mockGetIssue, mockReportIssue, mockListMyIssues, mockSetUpvote, mockListComments, mockAddComment,
} from './mock';
import { USE_MOCK } from '../lib/env';
import type { Issue, Evidence, ReportResponse, Comment } from '../types';

export async function listIssues(params: {
  lat: number;
  lng: number;
  radius_m?: number;
}): Promise<{ issues: Issue[] }> {
  if (USE_MOCK) return mockListIssues(params.lat, params.lng);
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_m: String(params.radius_m ?? 2000),
  });
  return apiFetch(`/api/issues?${q}`);
}

export async function getIssue(id: string): Promise<{ issue: Issue; evidence: Evidence[] }> {
  if (USE_MOCK) return mockGetIssue(id);
  return apiFetch(`/api/issues/${id}`);
}

export async function reportIssue(formData: FormData): Promise<ReportResponse> {
  if (USE_MOCK) return mockReportIssue(formData);
  return apiFetch('/api/issues', { method: 'POST', body: formData });
}

export async function addUpvote(issueId: string): Promise<{ issue: Issue }> {
  if (USE_MOCK) return mockSetUpvote(issueId, true);
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'POST' });
}

export async function removeUpvote(issueId: string): Promise<{ issue: Issue }> {
  if (USE_MOCK) return mockSetUpvote(issueId, false);
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'DELETE' });
}

/** Issues reported by the logged-in user. Proposed endpoint — not in roadmap §4 yet. */
export async function listMyIssues(): Promise<{ issues: Issue[] }> {
  if (USE_MOCK) return mockListMyIssues();
  return apiFetch('/api/issues/mine');
}

/** Proposed endpoints — not in roadmap §4 yet. POST requires auth; the server takes the author from the token. */
export async function listComments(issueId: string): Promise<{ comments: Comment[] }> {
  if (USE_MOCK) return mockListComments(issueId);
  return apiFetch(`/api/issues/${issueId}/comments`);
}

export async function addComment(issueId: string, body: string): Promise<{ comment: Comment }> {
  if (USE_MOCK) return mockAddComment(issueId, body);
  return apiFetch(`/api/issues/${issueId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}
