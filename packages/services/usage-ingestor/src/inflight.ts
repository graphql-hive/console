import type { ServiceLogger } from '@hive/service-common';
import { committedOffsetLag, errors } from './metrics';

export interface InflightEntry {
  topic: string;
  partition: number;
  offset: string;
  bytes: number;
  /**
   * Resolves once every ClickHouse write for the message is acknowledged.
   * Rejects only when the writer is destroyed mid-retry.
   */
  promise: Promise<unknown>;
}

export interface OffsetToCommit {
  topic: string;
  partition: number;
  offset: string;
}

interface Pending {
  offset: bigint;
  done: boolean;
}

interface PartitionState {
  topic: string;
  partition: number;
  queue: Pending[];
  /** Next offset to commit: one past the newest message whose predecessors are all done. */
  nextOffset: bigint | null;
  committedOffset: bigint | null;
  highWatermark: bigint | null;
}

function partitionKey(topic: string, partition: number) {
  return `${topic}:${partition}`;
}

function findOrInsert(queue: Pending[], offset: bigint): Pending {
  let index = queue.length;
  while (index > 0 && queue[index - 1].offset >= offset) {
    if (queue[index - 1].offset === offset) {
      return queue[index - 1];
    }
    index -= 1;
  }
  const pending: Pending = { offset, done: false };
  queue.splice(index, 0, pending);
  return pending;
}

/**
 * Tracks messages whose ClickHouse writes are still in flight and commits Kafka offsets
 * strictly in order per partition, so an offset is never committed ahead of a message
 * that ClickHouse has not acknowledged.
 */
export function createInflightTracker(config: {
  maxBytes: number;
  commitIntervalMs: number;
  heartbeatIntervalMs?: number;
  onCommit(offsets: OffsetToCommit[]): Promise<void>;
  logger: ServiceLogger;
}) {
  const { logger } = config;
  const heartbeatIntervalMs = config.heartbeatIntervalMs ?? 3_000;
  const partitions = new Map<string, PartitionState>();
  let inflightBytes = 0;
  let inflightCount = 0;
  let settleWaiters: Array<() => void> = [];
  let commitInProgress: Promise<void> | null = null;

  const commitTimer = setInterval(() => {
    void flushCommits();
  }, config.commitIntervalMs);
  commitTimer.unref?.();

  function getPartition(topic: string, partition: number) {
    const key = partitionKey(topic, partition);
    let state = partitions.get(key);
    if (!state) {
      state = {
        topic,
        partition,
        queue: [],
        nextOffset: null,
        committedOffset: null,
        highWatermark: null,
      };
      partitions.set(key, state);
    }
    return state;
  }

  function updateLag(state: PartitionState) {
    if (
      state.highWatermark === null ||
      state.nextOffset === null ||
      partitions.get(partitionKey(state.topic, state.partition)) !== state
    ) {
      return;
    }
    committedOffsetLag.set(
      { partition: String(state.partition) },
      Number(state.highWatermark - state.nextOffset),
    );
  }

  function notifySettled() {
    const waiters = settleWaiters;
    settleWaiters = [];
    for (const wake of waiters) {
      wake();
    }
  }

  function nextSettle() {
    return new Promise<void>(resolve => {
      settleWaiters.push(resolve);
    });
  }

  function advance(state: PartitionState) {
    let moved = false;
    while (state.queue.length > 0 && state.queue[0].done) {
      state.nextOffset = state.queue[0].offset + 1n;
      state.queue.shift();
      moved = true;
    }
    if (moved) {
      updateLag(state);
    }
  }

  function settle(
    state: PartitionState,
    pending: Pending | null,
    bytes: number,
    succeeded: boolean,
  ) {
    inflightBytes -= bytes;
    inflightCount -= 1;
    if (succeeded && pending) {
      pending.done = true;
      advance(state);
    }
    notifySettled();
  }

  async function flushCommits() {
    if (commitInProgress) {
      return commitInProgress;
    }

    const offsets: OffsetToCommit[] = [];
    const states: Array<{ state: PartitionState; offset: bigint }> = [];
    for (const state of partitions.values()) {
      if (state.nextOffset !== null && state.nextOffset !== state.committedOffset) {
        offsets.push({
          topic: state.topic,
          partition: state.partition,
          offset: state.nextOffset.toString(),
        });
        states.push({ state, offset: state.nextOffset });
      }
    }

    if (offsets.length === 0) {
      return;
    }

    commitInProgress = config
      .onCommit(offsets)
      .then(() => {
        for (const { state, offset } of states) {
          state.committedOffset = offset;
        }
      })
      .catch(error => {
        errors.inc();
        logger.warn(
          {
            offsets,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to commit offsets - will retry on the next interval',
        );
      })
      .finally(() => {
        commitInProgress = null;
      });

    return commitInProgress;
  }

  return {
    /**
     * After every group join kafkajs resumes each assigned partition from its committed offset,
     * so a message whose writes are still in flight is delivered again. Both copies carry the
     * same deduplication token, so whichever ClickHouse acknowledges first proves the rows are
     * stored: a repeat shares its first delivery's slot instead of appending one that would move
     * the commit offset backwards, and a repeat of an already acknowledged offset needs no slot.
     */
    track(entry: InflightEntry) {
      const state = getPartition(entry.topic, entry.partition);
      const offset = BigInt(entry.offset);
      inflightBytes += entry.bytes;
      inflightCount += 1;
      const pending =
        state.nextOffset !== null && offset < state.nextOffset
          ? null
          : findOrInsert(state.queue, offset);
      entry.promise.then(
        () => settle(state, pending, entry.bytes, true),
        () => settle(state, pending, entry.bytes, false),
      );
    },

    async waitForCapacity(bytes: number, heartbeat: () => Promise<void>) {
      if (inflightBytes + bytes <= config.maxBytes || inflightCount === 0) {
        return;
      }

      const heartbeatTimer = setInterval(() => {
        heartbeat().catch(error => {
          logger.debug(
            { error: error instanceof Error ? error.message : String(error) },
            'Heartbeat failed while waiting for capacity',
          );
        });
      }, heartbeatIntervalMs);

      try {
        while (inflightBytes + bytes > config.maxBytes && inflightCount > 0) {
          await nextSettle();
        }
      } finally {
        clearInterval(heartbeatTimer);
      }
    },

    observeHighWatermark(topic: string, partition: number, highWatermark: string) {
      const state = getPartition(topic, partition);
      state.highWatermark = BigInt(highWatermark);
      updateLag(state);
    },

    /**
     * Drops state for partitions this consumer no longer owns after a rebalance.
     * Their uncommitted messages are replayed by the new owner and deduplicated by token.
     */
    retainPartitions(assignment: Record<string, number[]>) {
      for (const [key, state] of partitions) {
        if (!assignment[state.topic]?.includes(state.partition)) {
          partitions.delete(key);
          committedOffsetLag.remove({ partition: String(state.partition) });
        }
      }
    },

    flushCommits,

    /**
     * Waits for in-flight writes to be acknowledged, then commits what completed.
     * Messages still unacknowledged at the deadline stay uncommitted and are replayed
     * on the next start.
     */
    async drain(deadlineMs: number) {
      clearInterval(commitTimer);
      const deadline = Date.now() + deadlineMs;

      while (inflightCount > 0 && Date.now() < deadline) {
        const wake = setTimeout(notifySettled, deadline - Date.now());
        try {
          await nextSettle();
        } finally {
          clearTimeout(wake);
        }
      }

      await flushCommits();

      if (inflightCount > 0) {
        logger.warn(
          { inflightMessages: inflightCount, inflightBytes },
          'Shutdown deadline reached with unacknowledged writes - they will be replayed',
        );
      }

      return { remaining: inflightCount };
    },

    inflight() {
      return { bytes: inflightBytes, count: inflightCount };
    },
  };
}
