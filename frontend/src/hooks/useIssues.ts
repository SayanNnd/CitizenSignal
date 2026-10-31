import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listIssues, getIssue, reportIssue, addUpvote, removeUpvote, listMyIssues, listComments, addComment } from '../api/issues';

const ISSUES_KEY = 'issues';

/** Nearby issues for the map, feed and search. Only open ones: fixed issues aren't shown to users. */
export function useIssues(lat: number | null, lng: number | null, radius_m?: number) {
  return useQuery({
    queryKey: [ISSUES_KEY, lat, lng, radius_m, 'open'],
    queryFn: () => listIssues({ lat: lat!, lng: lng!, radius_m, status: 'open' }),
    enabled: lat !== null && lng !== null,
    select: (data) => data.issues,
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id),
  });
}

export function useReportIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => reportIssue(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] }),
  });
}

export function useUpvote() {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: (issueId: string) => addUpvote(issueId),
    onSuccess: (_, issueId) => {
      queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });

  const remove = useMutation({
    mutationFn: (issueId: string) => removeUpvote(issueId),
    onSuccess: (_, issueId) => {
      queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', issueId] });
      queryClient.invalidateQueries({ queryKey: [ISSUES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });
}
