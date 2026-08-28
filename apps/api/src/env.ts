import "dotenv/config";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

/**
 * Reads a required environment variable. A fallback is only ever honored
 * outside production, so a misconfigured production deploy fails fast
 * instead of silently running with an insecure default (e.g. a publicly
 * known ADMIN_SECRET).
 */
function required(name: string, devFallback?: string): string {
  const value = process.env[name] ?? (isProduction ? undefined : devFallback);
  if (!value) {
    throw new Error(
      isProduction
        ? `Missing required environment variable: ${name}. This must be set explicitly in production.`
        : `Missing required environment variable: ${name}`
    );
  }
  return value;
}

/** Parses simple durations like "12h", "30m", "7d", "45s" (or a bare number of seconds) into seconds. */
function parseDurationToSeconds(input: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(input.trim());
  if (!match) return fallbackSeconds;
  const value = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  const multiplier = { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24 }[unit] ?? 1;
  return value * multiplier;
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "12h";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/dev_assessment"),
  adminSecret: required("ADMIN_SECRET", "dev-only-insecure-secret-change-me"),
  jwtExpiresIn,
  jwtExpiresInSeconds: parseDurationToSeconds(jwtExpiresIn, 60 * 60 * 12),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001").split(","),
  nodeEnv,
  isProduction,
};
