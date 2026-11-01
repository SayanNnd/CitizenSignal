import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  listIssues, getIssue, reportIssue, addUpvote, removeUpvote, listMyIssues, listComments, addComment, setIssueStatus,
} from '../api/issues';
import { DEFAULT_RADIUS_M } from '../constants/limits';
import type { Comment, Issue, IssueDetail, MyIssue, Status } from '../types';

const ISSUES_KEY = 'issues';
const statusMutationSequence = new Map<string, number>();
let nextStatusMutationSequence = 0;
type IssueListData = { issues: (Issue | MyIssue)[] };
type IssueSnapshots = {
  lists: Array<[QueryKey, Issue | MyIssue | undefined]>;
  detail: IssueDetail | undefined;
};

function snapshotIssueCaches(queryClient: QueryClient, issueId: string): IssueSnapshots {
  return {
    lists: queryClient.getQueriesData<IssueListData>({ queryKey: [ISSUES_KEY] })
      .map(([key, data]): [QueryKey, Issue | MyIssue | undefined] => [
        key,
        data?.issues.find((issue) => issue.id === issueId),
      ]),
    detail: queryClient.getQueryData<IssueDetail>(['issue', issueId]),
  };
}

function getCachedIssue(queryClient: QueryClient, issueId: string): Issue | undefined {
  const detail = queryClient.getQueryData<IssueDetail>(['issue', issueId]);
  if (detail) return detail.issue;
  for (const [, data] of queryClient.getQueriesData<IssueListData>({ queryKey: [ISSUES_KEY] })) {
    const issue = data?.issues.find((item) => item.id === issueId);
    if (issue) return issue;
  }
  return undefined;
}

function restoreIssueCaches(
  queryClient: QueryClient,
  issueId: string,
  snapshot: IssueSnapshots | undefined,
  restore: (current: Issue, previous: Issue) => Issue,
  restoreHistory = false,
) {
  if (!snapshot) return;
  for (const [key, previous] of snapshot.lists) {
    if (!previous) continue;
    queryClient.setQueryData<IssueListData>(key, (old) => {
      if (!old) return old;
      const current = old.issues.find((issue) => issue.id === issueId);
      const base = current ?? previous;
      const restored = { ...base, ...restore(base, previous) };
      const statusFilter = key[4];
      if (statusFilter === 'open' && restored.status !== 'open') {
        return { ...old, issues: old.issues.filter((issue) => issue.id !== issueId) };
      }
      if (statusFilter === 'resolved' && restored.status !== 'resolved') {
        return { ...old, issues: old.issues.filter((issue) => issue.id !== issueId) };
      }
      const issues = current
        ? old.issues.map((issue) => issue.id === issueId ? restored : issue)
        : [...old.issues, restored].sort(
          (a, b) => b.priority - a.priority || Date.parse(b.created_at) - Date.parse(a.created_at),
        );
      if (current) issues.sort(
        (a, b) => b.priority - a.priority || Date.parse(b.created_at) - Date.parse(a.created_at),
      );
      return { ...old, issues };
    });
  }

  const previousDetail = snapshot.detail;
  if (previousDetail) {
    queryClient.setQueryData<IssueDetail>(['issue', issueId], (old) => {
      if (!old) return old;
      const issue = { ...old.issue, ...restore(old.issue, previousDetail.issue) };
      return {
        ...old,
        issue,
        resolution_history:
          restoreHistory && issue.status !== old.issue.status ? previousDetail.resolution_history : old.resolution_history,
      };
    });
  }
}

function updateIssueCaches(queryClient: QueryClient, issueId: string, update: (issue: Issue) => Issue) {
  for (const [key, old] of queryClient.getQueriesData<IssueListData>({ queryKey: [ISSUES_KEY] })) {
    if (!old) continue;
    const statusFilter = key[4];
    const issues = old.issues.flatMap((cached) => {
      if (cached.id !== issueId) return [cached];
      const changed = { ...cached, ...update(cached) };
      if (statusFilter === 'open' && changed.status !== 'open') return [];
      if (statusFilter === 'resolved' && changed.status !== 'resolved') return [];
      return [changed];
    });
    issues.sort((a, b) => b.priority - a.priority || Date.parse(b.created_at) - Date.parse(a.created_at));
    queryClient.setQueryData(key, { ...old, issues });
  }

  queryClient.setQueryData<IssueDetail>(['issue', issueId], (old) => (
    old ? { ...old, issue: update(old.issue) } : old
  ));
}

function applyServerIssue(queryClient: QueryClient, issue: Issue) {
  updateIssueCaches(queryClient, issue.id, (cached) => ({ ...cached, ...issue }));

  for (const [key, old] of queryClient.getQueriesData<IssueListData>({ queryKey: [ISSUES_KEY] })) {
    if (!old || typeof key[1] !== 'number' || typeof key[2] !== 'number') continue;
    const statusFilter = key[4];
    if (statusFilter === 'open' && issue.status !== 'open') continue;
    if (statusFilter === 'resolved' && issue.status !== 'resolved') continue;

    const latitudeDelta = (issue.latitude - key[1]) * 111_320;
    const meanLatitude = ((issue.latitude + key[1]) / 2) * Math.PI / 180;
    const longitudeDelta = (issue.longitude - key[2]) * 111_320 * Math.cos(meanLatitude);
    const radius = typeof key[3] === 'number' ? key[3] : DEFAULT_RADIUS_M;
    if (Math.hypot(latitudeDelta, longitudeDelta) > radius) continue;

    const exists = old.issues.some((cached) => cached.id === issue.id);
    if (!exists) {
      queryClient.setQueryData(key, {
        ...old,
        issues: [...old.issues, issue].sort(
          (a, b) => b.priority - a.priority || Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
      });
    }
  }
}

function invalidateIssueCaches(queryClient: QueryClient, issueId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] }),
    queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
  ]);
}

/**
 * Nearby issues for the map, feed and search. Only open ones: fixed issues aren't shown to users.
 * Pass null coordinates until the location is known. When the area changes, the previous list
 * stays on screen until the new one arrives instead of flashing a spinner.
 */
export function useIssues(lat: number | null, lng: number | null, radius_m?: number) {
  return useQuery({
    queryKey: [ISSUES_KEY, lat, lng, radius_m, 'open'],
    queryFn: () => listIssues({ lat: lat!, lng: lng!, radius_m, status: 'open' }),
    enabled: lat !== null && lng !== null,
    placeholderData: keepPreviousData,
    select: (data) => data.issues,
  });
}

/** Every issue in the area, open and fixed, for the admin screen. */
export function useAreaIssues(lat: number | null, lng: number | null, radius_m?: number) {
  return useQuery({
    queryKey: [ISSUES_KEY, lat, lng, radius_m, 'all'],
    queryFn: () => listIssues({ lat: lat!, lng: lng!, radius_m }),
    enabled: lat !== null && lng !== null,
    select: (data) => data.issues,
  });
}

/** Admin close / reopen updates cached screens immediately, then reconciles with the server row. */
export function useSetIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['issue-status'],
    scope: { id: 'issue-status' },
    mutationFn: ({ id, status }: { id: string; status: Status }) => setIssueStatus(id, status),
    onMutate: async ({ id, status }) => {
      const sequence = ++nextStatusMutationSequence;
      statusMutationSequence.set(id, sequence);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: [ISSUES_KEY] }),
        queryClient.cancelQueries({ queryKey: ['issue', id] }),
      ]);
      const previous = snapshotIssueCaches(queryClient, id);
      if (statusMutationSequence.get(id) !== sequence) return { previous, sequence, status };
      const previousIssue = getCachedIssue(queryClient, id);
      const changed = previousIssue?.status !== status;
      const changedAt = new Date().toISOString();
      updateIssueCaches(queryClient, id, (issue) => ({
        ...issue,
        ...(issue.status === status ? {} : {
          status,
          resolved_at: status === 'resolved' ? changedAt : null,
          days_open: status === 'resolved' ? 0 : issue.days_open,
        }),
      }));
      queryClient.setQueryData<IssueDetail>(['issue', id], (old) => {
        if (!old || !changed) return old;
        const history = [...old.resolution_history];
        if (status === 'resolved') {
          history.push({ id: `pending-${Date.now()}`, resolved_at: changedAt, reopened_at: null });
        } else {
          let activeIndex = -1;
          for (let index = history.length - 1; index >= 0; index -= 1) {
            if (history[index]?.reopened_at === null) { activeIndex = index; break; }
          }
          if (activeIndex >= 0) history[activeIndex] = { ...history[activeIndex], reopened_at: changedAt };
        }
        return { ...old, resolution_history: history };
      });
      return { previous, sequence, status };
    },
    onError: (_error, { id }, context) => {
      if (!context || statusMutationSequence.get(id) !== context.sequence) return;
      restoreIssueCaches(
        queryClient,
        id,
        context.previous,
        (current, previous) => current.status === context.status ? ({
          ...current,
          status: previous.status,
          resolved_at: previous.resolved_at,
          days_open: previous.days_open,
        }) : current,
        true,
      );
    },
    onSuccess: ({ issue }, { id }, context) => {
      if (context && statusMutationSequence.get(id) === context.sequence) applyServerIssue(queryClient, issue);
    },
    onSettled: (_data, _error, { id }, context) => {
      if (!context || statusMutationSequence.get(id) !== context.sequence) return;
      statusMutationSequence.delete(id);
      void invalidateIssueCaches(queryClient, id);
    },
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id),
  });
}

/** Refresh lists with the exact issue/outcome returned by the backend after a report completes. */
export function useReportIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => reportIssue(formData),
    onSuccess: (result) => {
      if (result.outcome === 'needs_confirmation') return;
      applyServerIssue(queryClient, result.issue);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['issue', result.issue.id] }),
      ]);
    },
  });
}

function useSetUpvote(value: boolean, issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: `issue-upvote:${issueId}` },
    mutationKey: ['issue-upvote', issueId],
    mutationFn: (issueId: string) => value ? addUpvote(issueId) : removeUpvote(issueId),
    onMutate: async (issueId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: [ISSUES_KEY] }),
        queryClient.cancelQueries({ queryKey: ['issue', issueId] }),
      ]);
      const previous = snapshotIssueCaches(queryClient, issueId);
      const previousIssue = getCachedIssue(queryClient, issueId);
      const change = previousIssue?.has_upvoted === value ? 0 : value ? 1 : -1;
      updateIssueCaches(queryClient, issueId, (issue) => {
        return {
          ...issue,
          has_upvoted: value,
          upvotes: Math.max(0, issue.upvotes + change),
          priority: Math.max(0, issue.priority + 2 * change),
        };
      });
      return { previous, change };
    },
    onError: (_error, issueId, context) => restoreIssueCaches(
      queryClient,
      issueId,
      context?.previous,
      (current, previous) => {
        if (current.has_upvoted !== value || !context) return current;
        return {
          ...current,
          has_upvoted: previous.has_upvoted,
          upvotes: Math.max(0, current.upvotes - context.change),
          priority: Math.max(0, current.priority - 2 * context.change),
        };
      },
    ),
    onSuccess: ({ issue }) => {
      if (queryClient.isMutating({ mutationKey: ['issue-upvote', issueId] }) === 1) {
        applyServerIssue(queryClient, issue);
      }
    },
    onSettled: (_data, _error, issueId) => {
      if (queryClient.isMutating({ mutationKey: ['issue-upvote', issueId] }) === 1) {
        void invalidateIssueCaches(queryClient, issueId);
      }
    },
  });
}

export function useUpvote(issueId: string) {
  const add = useSetUpvote(true, issueId);
  const remove = useSetUpvote(false, issueId);
  return { add, remove };
}

export function useMyIssues() {
  return useQuery({
    queryKey: [ISSUES_KEY, 'mine'],
    queryFn: listMyIssues,
    select: (data) => data.issues,
  });
}

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ['comments', issueId],
    queryFn: () => listComments(issueId),
    select: (data) => data.comments,
  });
}

export function useAddComment(issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(issueId, body),
    onMutate: async (body) => {
      const key = ['comments', issueId] as const;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: key }),
        queryClient.cancelQueries({ queryKey: [ISSUES_KEY] }),
        queryClient.cancelQueries({ queryKey: ['issue', issueId] }),
      ]);
      const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Comment = {
        id: optimisticId,
        issue_id: issueId,
        author: 'You',
        body,
        created_at: new Date().toISOString(),
        is_mine: true,
      };
      queryClient.setQueryData<{ comments: Comment[] }>(key, (old) => ({
        comments: [...(old?.comments ?? []), optimistic],
      }));
      updateIssueCaches(queryClient, issueId, (issue) => ({ ...issue, comment_count: issue.comment_count + 1 }));
      return { key, optimisticId };
    },
    onError: (_error, _body, context) => {
      if (!context) return;
      queryClient.setQueryData<{ comments: Comment[] }>(context.key, (old) => old ? {
        ...old,
        comments: old.comments.filter((item) => item.id !== context.optimisticId),
      } : old);
      updateIssueCaches(queryClient, issueId, (issue) => ({
        ...issue,
        comment_count: Math.max(0, issue.comment_count - 1),
      }));
    },
    onSuccess: ({ comment }, _body, context) => {
      if (!context) return;
      queryClient.setQueryData<{ comments: Comment[] }>(context.key, (old) => ({
        comments: [
          ...(old?.comments ?? []).filter((item) => item.id !== context.optimisticId),
          comment,
        ].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }));
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['comments', issueId] }),
        invalidateIssueCaches(queryClient, issueId),
      ]);
    },
  });
}
