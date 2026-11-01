import { apiFetch, apiUpload } from './client';
import {
  mockListIssues, mockGetIssue, mockReportIssue, mockListMyIssues, mockSetUpvote, mockListComments, mockAddComment,
  mockSetStatus,
} from './mock';
import { USE_MOCK } from '../lib/env';
import { DEFAULT_RADIUS_M, MAX_RADIUS_M } from '../constants/limits';
import type { Issue, MyIssue, IssueDetail, ReportResponse, Comment, Status } from '../types';

export async function listIssues(params: {
  lat: number;
  lng: number;
  radius_m?: number;
  status?: Status;
}): Promise<{ issues: Issue[] }> {
  if (USE_MOCK) return mockListIssues(params.lat, params.lng, params.status);
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_m: String(Math.min(params.radius_m ?? DEFAULT_RADIUS_M, MAX_RADIUS_M)),
  });
  if (params.status) q.set('status', params.status);
  return apiFetch(`/api/issues?${q}`);
}

export async function getIssue(id: string): Promise<IssueDetail> {
  if (USE_MOCK) return mockGetIssue(id);
  return apiFetch(`/api/issues/${id}`);
}

export async function reportIssue(formData: FormData): Promise<ReportResponse> {
  if (USE_MOCK) return mockReportIssue(formData);
  return apiUpload('/api/issues', formData);
}

export async function addUpvote(issueId: string): Promise<{ issue: Issue }> {
  if (USE_MOCK) return mockSetUpvote(issueId, true);
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'POST' });
}

export async function removeUpvote(issueId: string): Promise<{ issue: Issue }> {
  if (USE_MOCK) return mockSetUpvote(issueId, false);
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'DELETE' });
}

/** Admins only (403 otherwise): close an issue (`resolved`) or open it again. */
export async function setIssueStatus(issueId: string, status: Status): Promise<{ issue: Issue }> {
  if (USE_MOCK) return mockSetStatus(issueId, status);
  return apiFetch(`/api/issues/${issueId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

/** Issues the caller reported or contributed evidence to (requires auth; 401 otherwise). */
export async function listMyIssues(): Promise<{ issues: MyIssue[] }> {
  if (USE_MOCK) return mockListMyIssues();
  return apiFetch('/api/issues/mine');
}

/** Discussion under an issue, oldest first. POST requires auth; the server takes the author from the token. */
export async function listComments(issueId: string): Promise<{ comments: Comment[] }> {
  if (USE_MOCK) return mockListComments(issueId);
  return apiFetch(`/api/issues/${issueId}/comments`);
}

export async function addComment(issueId: string, body: string): Promise<{ comment: Comment }> {
  if (USE_MOCK) return mockAddComment(issueId, body);
  return apiFetch(`/api/issues/${issueId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}
