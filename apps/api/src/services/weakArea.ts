import { eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import {
  DEFAULT_WEAK_AREA_ACCURACY_THRESHOLD,
  DEFAULT_WEAK_AREA_MIN_ATTEMPTS,
  SETTINGS_KEYS,
} from "@dap/shared";

/**
 * Weak areas are NEVER stored as a category on a question or topic.
 * They are derived, on read, from attempt_answers history. This keeps
 * the rule configurable (via the settings table) without any migration.
 */
export async function getWeakAreaThresholds() {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, SETTINGS_KEYS.WEAK_AREA_ACCURACY_THRESHOLD));

  const minAttemptsRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, SETTINGS_KEYS.WEAK_AREA_MIN_ATTEMPTS));

  const accuracyThreshold = rows[0] ? Number(rows[0].value) : DEFAULT_WEAK_AREA_ACCURACY_THRESHOLD;
  const minAttempts = minAttemptsRows[0]
    ? Number(minAttemptsRows[0].value)
    : DEFAULT_WEAK_AREA_MIN_ATTEMPTS;

  return { accuracyThreshold, minAttempts };
}

export function isWeakTopic(
  accuracy: number,
  attempts: number,
  thresholds: { accuracyThreshold: number; minAttempts: number }
): boolean {
  return attempts >= thresholds.minAttempts && accuracy < thresholds.accuracyThreshold;
}
