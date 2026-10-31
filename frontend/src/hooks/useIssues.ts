import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listIssues, getIssue, reportIssue, addUpvote, removeUpvote } from '../api/issues';

const ISSUES_KEY = 'issues';

export function useIssues(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: [ISSUES_KEY, lat, lng],
    queryFn: () => listIssues({ lat: lat!, lng: lng! }),
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

