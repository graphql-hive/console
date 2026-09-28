import type { ServiceLogger } from '@hive/service-common';
import {
  committedOffsetLag,
  errors,
  inflightBytes as inflightBytesGauge,
  inflightMessages as inflightMessagesGauge,
} from './metrics';

export interface InflightEntry {
  topic: string;
  partition: number;
  offset: string;
  bytes: number;
  /**
   * Resolves once the message is acknowledged by every table or given up on. Rejects when
   * the writes were abandoned (shutdown, an unexpected error), which leaves the offset
   * uncommitted so the message is replayed.
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

  function updateInflightGauges() {
    inflightBytesGauge.set(inflightBytes);
    inflightMessagesGauge.set(inflightCount);
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

  function settle(state: PartitionState, pending: Pending, bytes: number, succeeded: boolean) {
    inflightBytes -= bytes;
    inflightCount -= 1;
    updateInflightGauges();
    if (succeeded) {
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
     * Tracker state lives for one consumer generation (see `reset`). An entry tracked late by
     * a handler from the previous generation is kept in offset order by the sorted insert, so
     * it can never move the commit offset past a message the new generation has not
     * acknowledged; a repeated offset shares its entry.
     */
    track(entry: InflightEntry) {
      const state = getPartition(entry.topic, entry.partition);
      inflightBytes += entry.bytes;
      inflightCount += 1;
      updateInflightGauges();
      const pending = findOrInsert(state.queue, BigInt(entry.offset));
      entry.promise.then(
        () => settle(state, pending, entry.bytes, true),
        () => settle(state, pending, entry.bytes, false),
      );
    },

    /**
     * Commits past a message without waiting for anything: a poison pill that was dropped.
     */
    skip(topic: string, partition: number, offset: string) {
      const state = getPartition(topic, partition);
      findOrInsert(state.queue, BigInt(offset)).done = true;
      advance(state);
    },

    async waitForCapacity(bytes: number, heartbeat: () => Promise<void>) {
      if (inflightBytes + bytes <= config.maxBytes || inflightCount === 0) {
        return;
      }

      const heartbeatTimer = setInterval(() => {
        heartbeat().catch(error => {
          // If the group is rebalancing this consumer cannot rejoin until the handler
          // returns, which needs in-flight capacity to free up first.
          logger.warn(
            { error: error instanceof Error ? error.message : String(error) },
            'Heartbeat failed while waiting for in-flight capacity',
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
     * Forgets every partition. Called on every group join: kafkajs re-delivers whatever the
     * broker has not committed (it resumes each partition from its last successful commit),
     * and those deliveries re-establish the queue; ClickHouse deduplicates the repeated
     * writes. Writes still in flight from before the join settle into the forgotten state and
     * only release their bytes.
     */
    reset() {
      for (const state of partitions.values()) {
        committedOffsetLag.remove({ partition: String(state.partition) });
      }
      partitions.clear();
    },

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

      // A commit that was already running when the last writes settled does not include them.
      if (commitInProgress) {
        await commitInProgress;
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
