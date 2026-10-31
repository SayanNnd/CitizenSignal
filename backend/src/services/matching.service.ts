import { getDistance } from 'geolib';
import { compareTwoStrings } from 'string-similarity';
import { supabase } from '../config/supabase.js';
import {
  AUTO_MERGE_METRES,
  AUTO_MERGE_TEXT,
  CANDIDATE_METRES,
  CANDIDATE_TEXT,
  PREFILTER_METRES,
} from '../config/matching.js';
import { boundingBox } from '../lib/geo.js';
import type { Category, IssueRow } from '../types/index.js';

/** Max candidates returned for `needs_confirmation`. */
const MAX_CANDIDATES = 3;

export interface ScoredMatch {
  row: IssueRow;
  distance_m: number;
  text_score: number;
}

export type MatchResult =
  | { kind: 'none' }
  | { kind: 'auto'; match: ScoredMatch }
  | { kind: 'candidates'; matches: ScoredMatch[] };

/** Lowercase, strip punctuation, collapse whitespace — so wording, not formatting, is compared. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matching pipeline for a new report (roadmap.md §6, steps 2–7):
 * same category → bounding-box prefilter → Geolib distance → string-similarity → decision.
 * Resolved issues are deliberately included: matching one is what triggers a reopen.
 */
export async function findMatches(
  category: Category,
  description: string,
  latitude: number,
  longitude: number,
): Promise<MatchResult> {
  const box = boundingBox(latitude, longitude, PREFILTER_METRES);

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('category', category)
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);
  if (error) throw new Error(`Matching query failed: ${error.message}`);

  const rows = (data ?? []) as IssueRow[];
  const normalizedNew = normalize(description);
  const scored: ScoredMatch[] = [];

  for (const row of rows) {
    const distance_m = getDistance({ latitude, longitude }, { latitude: row.latitude, longitude: row.longitude });
    if (distance_m > CANDIDATE_METRES) continue;

    const text_score = compareTwoStrings(normalizedNew, normalize(row.description));
    if (text_score >= CANDIDATE_TEXT) scored.push({ row, distance_m, text_score });
  }

  if (!scored.length) return { kind: 'none' };

  // Best by text score, then by proximity.
  scored.sort((a, b) => b.text_score - a.text_score || a.distance_m - b.distance_m);

  const best = scored[0];
  if (best.text_score >= AUTO_MERGE_TEXT && best.distance_m <= AUTO_MERGE_METRES) {
    return { kind: 'auto', match: best };
  }

  return { kind: 'candidates', matches: scored.slice(0, MAX_CANDIDATES) };
}
