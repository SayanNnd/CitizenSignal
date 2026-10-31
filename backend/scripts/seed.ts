/**
 * Seed script: resets the database to a repeatable demo state and makes sure the
 * `issue-images` storage bucket exists.
 *
 *   npm run seed                      # seeds around the default location (New Delhi)
 *   npm run seed -- <lat> <lng>       # seeds around your demo location
 *
 * Clears ALL existing issues, evidence, upvotes and stored photos before inserting.
 * Every seeded issue and evidence row gets a generated placeholder photo.
 */
import sharp from 'sharp';
import { z } from 'zod';
import { supabase } from '../src/config/supabase.js';
import { IMAGE_BUCKET, processAndUploadImage } from '../src/services/image.service.js';
import { generateTitle } from '../src/services/issues.service.js';
import type { Category, Status } from '../src/types/index.js';

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const DAY_MS = 24 * 60 * 60 * 1000;

// Each arg is optional; `.default()` only applies to `undefined`, so parse them one by one.
const LatArg = z.coerce.number().min(-90).max(90).default(DEFAULT_LAT);
const LngArg = z.coerce.number().min(-180).max(180).default(DEFAULT_LNG);

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

interface SeedIssue {
  label: string;
  category: Category;
  description: string;
  dLat: number;
  dLng: number;
  status: Status;
  upvotes: number;
  recurrence_count: number;
  createdDaysAgo: number;
  resolvedDaysAgo?: number;
  reopenedDaysAgo?: number;
  /** Extra reports attached as evidence rows (evidence_count = 1 + this length). */
  evidence: string[];
}

// Offsets are in degrees: 0.0001° ≈ 11 m of latitude.
const SEED: SeedIssue[] = [
  {
    label: 'resolved pothole (demo: reopen)',
    category: 'pothole',
    description: 'Large pothole causing serious vehicle damage and flat tyres near the junction',
    dLat: 0,
    dLng: 0,
    status: 'resolved',
    upvotes: 8,
    recurrence_count: 0,
    createdDaysAgo: 21,
    resolvedDaysAgo: 7,
    evidence: ['Pothole at the junction is getting bigger', 'Two cars got flat tyres at this pothole today'],
  },
  {
    label: 'open pothole ~19 m away (demo: needs_confirmation)',
    category: 'pothole',
    description: 'Deep pothole on main road causing traffic slowdown near signal',
    dLat: 0.00015,
    dLng: 0.0001,
    status: 'open',
    upvotes: 5,
    recurrence_count: 1,
    createdDaysAgo: 30,
    resolvedDaysAgo: 12,
    reopenedDaysAgo: 3,
    evidence: ['The main road pothole is back after the repair'],
  },
  {
    label: 'streetlight',
    category: 'streetlight',
    description: 'Broken streetlight making lane 4 completely dark and unsafe at night',
    dLat: 0.0003,
    dLng: -0.0002,
    status: 'open',
    upvotes: 3,
    recurrence_count: 0,
    createdDaysAgo: 2,
    evidence: [],
  },
  {
    label: 'garbage, aging',
    category: 'garbage',
    description: 'Overflowing garbage bin not cleared in two weeks causing foul smell',
    dLat: -0.0004,
    dLng: 0.0003,
    status: 'open',
    upvotes: 12,
    recurrence_count: 2,
    createdDaysAgo: 14,
    evidence: ['Bin still overflowing, stray dogs spreading the rubbish', 'Smell is unbearable now', 'Still not cleared'],
  },
  {
    label: 'water leak',
    category: 'water_leak',
    description: 'Water pipe leaking onto the footpath and flooding the bus stop',
    dLat: 0.0006,
    dLng: 0.0005,
    status: 'open',
    upvotes: 1,
    recurrence_count: 0,
    createdDaysAgo: 0,
    evidence: [],
  },
];

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Listing buckets failed: ${error.message}`);
  if (buckets.some((b) => b.name === IMAGE_BUCKET)) {
    console.log(`  ✓ bucket "${IMAGE_BUCKET}" exists`);
    return;
  }
  const { error: createError } = await supabase.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/webp'],
  });
  if (createError) throw new Error(`Creating bucket failed: ${createError.message}`);
  console.log(`  ✓ bucket "${IMAGE_BUCKET}" created (public)`);
}

/** Placeholder colour per category, so seeded photos are easy to tell apart. */
const CATEGORY_COLOURS: Record<Category, string> = {
  pothole: '#6d4c41',
  streetlight: '#283593',
  garbage: '#2e7d32',
  water_leak: '#0277bd',
  drainage: '#00695c',
  road_damage: '#4e342e',
  other: '#455a64',
};

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Draws a simple labelled placeholder and uploads it through the real Sharp → bucket pipeline. */
async function placeholderPhoto(category: Category, caption: string): Promise<string> {
  const label = category.replace(/_/g, ' ').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
    <rect width="100%" height="100%" fill="${CATEGORY_COLOURS[category]}"/>
    <text x="50%" y="46%" font-family="sans-serif" font-size="140" font-weight="bold" fill="#fff" text-anchor="middle">${label}</text>
    <text x="50%" y="58%" font-family="sans-serif" font-size="56" fill="#fff" fill-opacity="0.85" text-anchor="middle">${escapeXml(caption)}</text>
    <text x="50%" y="92%" font-family="sans-serif" font-size="40" fill="#fff" fill-opacity="0.6" text-anchor="middle">CitizenSignal demo photo</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return (await processAndUploadImage(png)).publicUrl;
}

/** Removes every stored photo; the rows that pointed at them are wiped by `clearTables`. */
async function clearBucket() {
  for (;;) {
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list('', { limit: 1000 });
    if (error) throw new Error(`Listing photos failed: ${error.message}`);
    // Folder placeholders have no id; only files can be removed.
    const paths = (data ?? []).filter((f) => f.id).map((f) => f.name);
    if (!paths.length) return;
    const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    if (removeError) throw new Error(`Removing photos failed: ${removeError.message}`);
  }
}

async function clearTables() {
  // PostgREST refuses unfiltered deletes, so filter on something that's always true.
  for (const [table, column] of [['upvotes', 'issue_id'], ['evidence', 'id'], ['issues', 'id']] as const) {
    const { error } = await supabase.from(table).delete().neq(column, NIL_UUID);
    if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
  }
}

async function seed() {
  const [latArg, lngArg] = process.argv.slice(2);
  const baseLat = LatArg.parse(latArg);
  const baseLng = LngArg.parse(lngArg);
  console.log(`🌱  Seeding around ${baseLat}, ${baseLng}`);

  await ensureBucket();

  console.log('🌱  Clearing existing data…');
  await clearTables();
  await clearBucket();

  console.log('🌱  Inserting seed issues…');
  for (const s of SEED) {
    const latitude = baseLat + s.dLat;
    const longitude = baseLng + s.dLng;

    const { data: issue, error } = await supabase
      .from('issues')
      .insert({
        category: s.category,
        title: generateTitle(s.category, s.description),
        description: s.description,
        latitude,
        longitude,
        status: s.status,
        image_url: await placeholderPhoto(s.category, 'Original report'),
        upvotes: s.upvotes,
        evidence_count: 1 + s.evidence.length,
        recurrence_count: s.recurrence_count,
        created_at: daysAgo(s.createdDaysAgo),
        resolved_at: s.resolvedDaysAgo === undefined ? null : daysAgo(s.resolvedDaysAgo),
        reopened_at: s.reopenedDaysAgo === undefined ? null : daysAgo(s.reopenedDaysAgo),
      })
      .select('id')
      .single();
    if (error) throw new Error(`Inserting ${s.label} failed: ${error.message}`);

    if (s.evidence.length) {
      const photos = await Promise.all(s.evidence.map((_, i) => placeholderPhoto(s.category, `Evidence #${i + 1}`)));
      const { error: evidenceError } = await supabase.from('evidence').insert(
        s.evidence.map((description, i) => ({
          issue_id: issue.id,
          description,
          image_url: photos[i],
          latitude: latitude + 0.00002 * (i + 1),
          longitude,
          created_at: daysAgo(Math.max(0, s.createdDaysAgo - (i + 1))),
        })),
      );
      if (evidenceError) throw new Error(`Inserting evidence for ${s.label} failed: ${evidenceError.message}`);
    }
    console.log(`  ✓ ${s.label}: ${issue.id}`);
  }

  console.log(`
✅  Seed complete. Demo phrases (category: pothole):
   reopen → at ${baseLat}, ${baseLng}:
            "Large pothole is back causing serious vehicle damage near the junction"
   confirm → at ${baseLat + 0.00015}, ${baseLng + 0.0001}:
            "Deep pothole near the signal slowing traffic"`);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
