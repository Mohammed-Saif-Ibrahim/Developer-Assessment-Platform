// Centralized, non-database-backed constants and defaults.
// Business rules that live here are intentionally simple so both the
// API and (indirectly, via API responses) the frontends stay in sync.

/** Default rule for classifying a topic as a "weak area". Configurable via /admin/settings. */
export const DEFAULT_WEAK_AREA_ACCURACY_THRESHOLD = 70; // percent
export const DEFAULT_WEAK_AREA_MIN_ATTEMPTS = 5;

export const SETTINGS_KEYS = {
  WEAK_AREA_ACCURACY_THRESHOLD: "weak_area_accuracy_threshold",
  WEAK_AREA_MIN_ATTEMPTS: "weak_area_min_attempts",
} as const;

export const DEFAULT_PRACTICE_QUESTION_COUNT = 10;
export const DEFAULT_TIMED_QUESTION_COUNT = 20;
export const DEFAULT_TIMED_DURATION_SECONDS = 20 * 60;

export const DIFFICULTIES = ["easy", "medium", "hard", "advanced"] as const;
export const QUESTION_TYPES = ["theory", "code_output", "debugging", "multiple_correct"] as const;
export const ASSESSMENT_MODES = ["practice", "timed", "mixed", "topic", "weak_areas"] as const;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
