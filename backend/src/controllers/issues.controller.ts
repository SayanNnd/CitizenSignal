import { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { ListQuerySchema, ReportBodySchema, IssueIdSchema } from '../schemas/issue.schema.js';
import {
  getNearbyIssues,
  getMyIssues,
  getIssueById,
  reportIssue,
  addUpvote,
  removeUpvote,
} from '../services/issues.service.js';

/** The upvote routes sit behind `requireAuth`; this narrows the type and guards misconfiguration. */
function requireUserId(req: Request): string {
  if (!req.user) throw HttpError.unauthorized();
  return req.user.id;
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
