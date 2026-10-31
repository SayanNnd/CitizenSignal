import { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import {
  ListQuerySchema,
  ReportBodySchema,
  IssueIdSchema,
  CommentBodySchema,
  StatusBodySchema,
} from '../schemas/issue.schema.js';
import {
  getNearbyIssues,
  getMyIssues,
  getIssueById,
  reportIssue,
  addUpvote,
  removeUpvote,
  getComments,
  addComment,
  setIssueStatus,
} from '../services/issues.service.js';
import type { AuthUser } from '../types/index.js';

/** The upvote and comment routes sit behind `requireAuth`; this narrows the type and guards misconfiguration. */
function requireUser(req: Request): AuthUser {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

function requireUserId(req: Request): string {
  return requireUser(req).id;
}

export async function listIssues(req: Request, res: Response) {
  const filters = ListQuerySchema.parse(req.query);
  const issues = await getNearbyIssues(filters, req.user?.id);
  res.json({ issues });
}

export async function listMyIssues(req: Request, res: Response) {
  const issues = await getMyIssues(requireUserId(req));
  res.json({ issues });
}

export async function getIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  res.json(await getIssueById(id, req.user?.id));
}

export async function createIssue(req: Request, res: Response) {
  const body = ReportBodySchema.parse(req.body ?? {});
  if (!req.file) {
    throw HttpError.validation('Photo is required', [{ field: 'photo', message: 'Photo is required' }]);
  }

  const result = await reportIssue({ ...body, photo: req.file.buffer, userId: req.user?.id });
  res.status(result.outcome === 'created' ? 201 : 200).json(result);
}

export async function upvoteIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  res.json({ issue: await addUpvote(id, requireUserId(req)) });
}

export async function unvoteIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  res.json({ issue: await removeUpvote(id, requireUserId(req)) });
}

export async function updateIssueStatus(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  const { status } = StatusBodySchema.parse(req.body ?? {});
  res.json({ issue: await setIssueStatus(id, status, requireUserId(req)) });
}

export async function listComments(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  res.json({ comments: await getComments(id, req.user?.id) });
}

export async function createComment(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  const { body } = CommentBodySchema.parse(req.body ?? {});
  res.status(201).json({ comment: await addComment(id, requireUser(req), body) });
}
