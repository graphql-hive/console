import z from 'zod';
import { psql, toDate, type CommonQueryMethods } from '@hive/postgres';
import type { Redis } from '@hive/service-common';

const targetTokenLastUsedRedisKeyPrefix = 'target-token:last-used';
const bucketDurationMs = 60_000;
const completedBucketCount = 5;

export const targetTokenLastUsedBucketTtlSeconds = 10 * 60;

export function targetTokenLastUsedBucketKey(date: Date) {
  return `${targetTokenLastUsedRedisKeyPrefix}:${Math.floor(date.getTime() / bucketDurationMs)}`;
}

export async function flushTargetTokenLastUsed(args: {
  redis: Redis;
  pg: CommonQueryMethods;
  now: Date;
}) {
  const currentBucket = Math.floor(args.now.getTime() / bucketDurationMs);
  const buckets = Array.from({ length: completedBucketCount }, (_, index) => {
    const minute = currentBucket - index - 1;
    return {
      key: `${targetTokenLastUsedRedisKeyPrefix}:${minute}`,
      date: new Date(minute * bucketDurationMs),
    };
  });

  const pipeline = args.redis.pipeline();
  for (const bucket of buckets) {
    pipeline.smembers(bucket.key);
  }

  const results = await pipeline.exec();
  if (results === null) {
    throw new Error('Target token last-used bucket pipeline was not executed.');
  }

  const errors: Array<Error> = [];
  for (const [error] of results) {
    if (error) errors.push(error);
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to read target token last-used buckets.');
  }

  let loadedBucketCount = 0;
  const latestTouches = new Map<string, Date>();

  for (const [index, [, state]] of results.entries()) {
    const tokens = z.array(z.string()).parse(state);
    if (tokens.length > 0) {
      loadedBucketCount++;
    }

    for (const token of tokens) {
      if (!latestTouches.has(token)) {
        latestTouches.set(token, buckets[index].date);
      }
    }
  }
  const touches = [...latestTouches].map(([token, date]) => ({ token, date }));

  if (touches.length === 0) {
    return { loadedBucketCount, updatedDateCount: 0 };
  }

  await args.pg.query(psql`
    UPDATE "tokens" AS "token"
    SET "last_used_at" = GREATEST(
      COALESCE("token"."last_used_at", "touch"."last_used_at"),
      "touch"."last_used_at"
    )
    FROM (
      VALUES (${psql.join(
        touches.map(touch => psql`${touch.token}, ${toDate(touch.date)}`),
        psql.fragment`), (`,
      )})
    ) AS "touch"("token", "last_used_at")
    WHERE
      "touch"."token" = "token"."token"
      AND "token"."deleted_at" IS NULL
  `);

  await args.redis.del(...buckets.map(bucket => bucket.key));

  return { loadedBucketCount, updatedDateCount: touches.length };
}
