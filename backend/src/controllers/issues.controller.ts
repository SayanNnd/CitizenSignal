import { Request, Response } from 'express';
import { ListQuerySchema, ReportBodySchema, IssueIdSchema } from '../schemas/issue.schema.js';
import {
  getNearbyIssues,
  getIssueById,
  reportIssue,
  addUpvote,
  removeUpvote,
} from '../services/issues.service.js';

export async function listIssues(req: Request, res: Response) {
  const query = ListQuerySchema.parse(req.query);
  const userId = (req as any).user?.id;
  const issues = await getNearbyIssues(query.lat, query.lng, query.radius_m, userId);
  res.json({ issues });
}

export async function getIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  const userId = (req as any).user?.id;
  const result = await getIssueById(id, userId);
  if (!result) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found', details: [] } });
    return;
  }
  res.json(result);
}

export async function createIssue(req: Request, res: Response) {
  const body = ReportBodySchema.parse(req.body);
  const userId = (req as any).user?.id;
  const imageBuffer = (req.file as Express.Multer.File | undefined)?.buffer;

  if (!imageBuffer && !body.confirm_issue_id && !body.force_new) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Photo is required', details: [{ field: 'photo', message: 'Photo is required' }] },
    });
    return;
  }

  const result = await reportIssue({
    ...body,
    imageBuffer,
    userId,
  });

  const status = result.outcome === 'created' ? 201 : 200;
  res.status(status).json(result);
}

export async function upvoteIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  const userId = (req as any).user.id;
  const issue = await addUpvote(id, userId);
  res.json({ issue });
}

export async function unvoteIssue(req: Request, res: Response) {
  const { id } = IssueIdSchema.parse(req.params);
  const userId = (req as any).user.id;
  const issue = await removeUpvote(id, userId);
  res.json({ issue });
}
