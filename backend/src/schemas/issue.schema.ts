import { z } from 'zod';

const CATEGORIES = [
  'pothole',
  'streetlight',
  'garbage',
  'water_leak',
  'drainage',
  'road_damage',
  'other',
] as const;

export const ReportBodySchema = z.object({
  category: z.enum(CATEGORIES, { message: 'Invalid category' }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(280, 'Description must be at most 280 characters'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  confirm_issue_id: z.string().uuid().optional(),
  force_new: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export const ListQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().positive().default(2000),
});

export const IssueIdSchema = z.object({
  id: z.string().uuid('Invalid issue id'),
});
