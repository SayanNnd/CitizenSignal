import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { issuesRouter } from './routes/issues.routes.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use('/health', healthRouter);
app.use('/api/health', healthRouter);
app.use('/api/issues', issuesRouter);

// Express 5 forwards async errors automatically — no try/catch wrappers needed.
app.use(notFoundMiddleware);
app.use(errorMiddleware);
