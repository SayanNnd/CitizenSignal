import { z } from 'zod';
import { CATEGORIES, STATUSES } from '../types/index.js';

/** Upper bound for `radius_m` on the list endpoint, so one request can't pull the whole table. */
const MAX_LIST_RADIUS_M = 20_000;

const MAX_SEARCH_LENGTH = 100;

/**
 * Treats a blank field (`?q=`, an empty multipart field) as missing. Without this,
 * `z.coerce.number()` turns "" into 0 and a report with no GPS lands at 0,0.
 */
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const latitude = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ invalid_type_error: 'Latitude is required and must be a number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
);

const longitude = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ invalid_type_error: 'Longitude is required and must be a number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
);

/** Multipart fields of `POST /issues`. Everything arrives as a string. */
export const ReportBodySchema = z
  .object({
    category: z.enum(CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` }),
    }),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(280, 'Description must be at most 280 characters'),
    latitude,
    longitude,
    confirm_issue_id: z.preprocess(
      emptyToUndefined,
      z.string().uuid('confirm_issue_id must be an issue id').optional(),
    ),
    force_new: z.preprocess(
      emptyToUndefined,
      z
        .enum(['true', 'false'], { errorMap: () => ({ message: 'force_new must be "true" or "false"' }) })
        .optional()
        .transform((v) => v === 'true'),
    ),
  })
  .refine((body) => !(body.confirm_issue_id && body.force_new), {
    message: 'Send either confirm_issue_id or force_new=true, not both',
    path: ['force_new'],
  });

export type ReportBody = z.infer<typeof ReportBodySchema>;

export const ListQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  radius_m: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: 'radius_m must be a number' })
      .positive('radius_m must be positive')
      .max(MAX_LIST_RADIUS_M, `radius_m must be at most ${MAX_LIST_RADIUS_M}`)
      .default(2000),
  ),
  q: z.preprocess(
    emptyToUndefined,
    z
      .string({ invalid_type_error: 'q must be a single search string' })
      .trim()
      .max(MAX_SEARCH_LENGTH, `q must be at most ${MAX_SEARCH_LENGTH} characters`)
      .optional(),
  ),
  category: z.preprocess(
    emptyToUndefined,
    z
      .enum(CATEGORIES, { errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` }) })
      .optional(),
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(STATUSES, { errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}` }) }).optional(),
  ),
});

export type ListQuery = z.infer<typeof ListQuerySchema>;

export const IssueIdSchema = z.object({
  id: z.string().uuid('Invalid issue id'),
});
