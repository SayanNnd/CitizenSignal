// ALL matching thresholds live here. Never hardcode these values elsewhere.

/** Dice-coefficient score at/above which two descriptions auto-merge (with distance ≤ AUTO_MERGE_METRES) */
export const AUTO_MERGE_TEXT = 0.75;

/** Distance in metres at/below which two reports auto-merge (with score ≥ AUTO_MERGE_TEXT) */
export const AUTO_MERGE_METRES = 25;

/** Dice-coefficient score at/above which a report is a candidate for confirmation */
export const CANDIDATE_TEXT = 0.5;

/** Max distance in metres for a report to be considered a candidate at all */
export const CANDIDATE_METRES = 50;

/** Bounding-box radius used in the SQL prefilter query */
export const PREFILTER_METRES = 75;
