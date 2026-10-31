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
import { computePriority } from './priority.service.js';
import type { Candidate, Issue } from '../types/index.js';

/** Degrees equivalent of a metre count (approximate, for bounding box) */
function degreesToMetres(metres: number) {
  return metres / 111_320;
}

/** Strip punctuation, lowercase, trim for fair comparison */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function rowToIssue(row: any, has_upvoted = false): Issue {
  const { priority, days_open } = computePriority(row);
  return { ...row, priority, days_open, has_upvoted };
}

type MatchResult =
  | { outcome: 'no_match' }
  | { outcome: 'auto_match'; row: any; isResolved: boolean }
  | { outcome: 'candidates'; candidates: Candidate[] };

/**
 * Run the full matching pipeline for a new report.
 * Steps: same-category bbox → Geolib distance → string-similarity → decision.
 */
export async function findMatches(
  category: string,
  description: string,
  latitude: number,
  longitude: number,
): Promise<MatchResult> {
  const delta = degreesToMetres(PREFILTER_METRES);

  const { data: rows, error } = await supabase
    .from('issues')
    .select('*')
    .eq('category', category)
    .gte('latitude', latitude - delta)
    .lte('latitude', latitude + delta)
    .gte('longitude', longitude - delta)
    .lte('longitude', longitude + delta);

  if (error) throw new Error(error.message);
  if (!rows?.length) return { outcome: 'no_match' };

  const normalizedNew = normalize(description);

  const scored: Array<{ row: any; distance_m: number; text_score: number }> = [];

  for (const row of rows) {
    const distance_m = getDistance(
      { latitude, longitude },
      { latitude: row.latitude, longitude: row.longitude },
    );
    if (distance_m > CANDIDATE_METRES) continue;

    const text_score = compareTwoStrings(normalizedNew, normalize(row.description as string));
    if (text_score >= CANDIDATE_TEXT) {
      scored.push({ row, distance_m, text_score });
    }
  }

  if (!scored.length) return { outcome: 'no_match' };

  // Best by text score, then by proximity
  scored.sort((a, b) => b.text_score - a.text_score || a.distance_m - b.distance_m);

  const best = scored[0];
  if (best.text_score >= AUTO_MERGE_TEXT && best.distance_m <= AUTO_MERGE_METRES) {
    return { outcome: 'auto_match', row: best.row, isResolved: best.row.status === 'resolved' };
  }

  const candidates: Candidate[] = scored.slice(0, 3).map((s) => ({
    ...rowToIssue(s.row),
    text_score: s.text_score,
    distance_m: s.distance_m,
  }));

  return { outcome: 'candidates', candidates };
}
