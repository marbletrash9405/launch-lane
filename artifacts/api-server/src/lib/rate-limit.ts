import { rateLimit, type Options, type Store } from "express-rate-limit";
import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * express-rate-limit store backed by the rate_limits table, so a limit is
 * shared by all serverless instances. If the database can't be reached the
 * request is allowed (passOnStoreError) rather than blocking real users.
 */
class PostgresStore implements Store {
  prefix: string;
  localKeys = false;
  private windowMs = 60_000;

  constructor(prefix: string) {
    this.prefix = `${prefix}:`;
  }

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  async increment(key: string) {
    const fullKey = this.prefix + key;
    const { rows } = await pool.query<{ hits: number; reset_at: Date }>(
      `INSERT INTO rate_limits (key, hits, reset_at)
       VALUES ($1, 1, now() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.hits + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= now()
           THEN now() + ($2 || ' milliseconds')::interval ELSE rate_limits.reset_at END
       RETURNING hits, reset_at`,
      [fullKey, String(this.windowMs)],
    );
    // Occasionally clear out expired counters.
    if (Math.random() < 0.02) {
      pool.query("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'").catch((error) => {
        logger.warn({ err: error }, "Could not prune rate limits");
      });
    }
    return { totalHits: rows[0].hits, resetTime: new Date(rows[0].reset_at) };
  }

  async decrement(key: string) {
    await pool.query("UPDATE rate_limits SET hits = GREATEST(hits - 1, 0) WHERE key = $1", [this.prefix + key]);
  }

  async resetKey(key: string) {
    await pool.query("DELETE FROM rate_limits WHERE key = $1", [this.prefix + key]);
  }
}

export function createRateLimiter({
  name,
  windowMs,
  limit,
  message,
}: {
  name: string;
  windowMs: number;
  limit: number;
  message: string;
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    ...(process.env.DATABASE_URL ? { store: new PostgresStore(name) } : {}),
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}
