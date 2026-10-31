import { apiFetch } from './client';
import { mockListIssues, mockGetIssue, mockReportIssue } from './mock';
import type { Issue, Evidence, ReportResponse } from '../types';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

export async function listIssues(params: {
  lat: number;
  lng: number;
  radius_m?: number;
}): Promise<{ issues: Issue[] }> {
  if (USE_MOCK) return mockListIssues();
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
  if (USE_MOCK) return mockReportIssue();
  return apiFetch('/api/issues', { method: 'POST', body: formData });
}

export async function addUpvote(issueId: string): Promise<{ issue: Issue }> {
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'POST' });
}

export async function removeUpvote(issueId: string): Promise<{ issue: Issue }> {
  return apiFetch(`/api/issues/${issueId}/upvote`, { method: 'DELETE' });
}

