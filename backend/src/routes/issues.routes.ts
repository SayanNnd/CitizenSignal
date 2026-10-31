import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  listIssues,
  listMyIssues,
  getIssue,
  createIssue,
  upvoteIssue,
  unvoteIssue,
  listComments,
  createComment,
} from '../controllers/issues.controller.js';

export const issuesRouter = Router();

issuesRouter.get('/', optionalAuth, listIssues);
// Must stay above '/:id', otherwise "mine" is parsed as an issue id.
issuesRouter.get('/mine', requireAuth, listMyIssues);
issuesRouter.get('/:id', optionalAuth, getIssue);
issuesRouter.post('/', optionalAuth, upload.single('photo'), createIssue);
issuesRouter.post('/:id/upvote', requireAuth, upvoteIssue);
issuesRouter.delete('/:id/upvote', requireAuth, unvoteIssue);
issuesRouter.get('/:id/comments', optionalAuth, listComments);
issuesRouter.post('/:id/comments', requireAuth, createComment);
