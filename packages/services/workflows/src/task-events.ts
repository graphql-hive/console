import EventEmitter from 'events';
import type { WorkerEvents } from 'graphile-worker';
import {
  jobCompleteCounter,
  jobDuration,
  jobErrorCounter,
  jobFailedCounter,
  jobQueueTime,
  jobSuccessCounter,
  workerFatalErrorCounter,
} from './metrics';

/**
 * Creates an event emitter with handlers for prometheus metrics for the Graphile Worker
 */
export function createTaskEventEmitter() {
  const events: WorkerEvents = new EventEmitter();

  events.on('job:start', ({ job }) => {
    const queueTimeInSeconds =
      (Date.now() - (new Date(job.run_at) ?? new Date(job.created_at)).getTime()) / 1000;
    jobQueueTime.observe({ task_identifier: job.task_identifier }, queueTimeInSeconds);
  });

  events.on('job:complete', ({ job }) => {
    jobCompleteCounter.inc({ task_identifier: job.task_identifier });
    jobDuration.observe(
      { task_identifier: job.task_identifier },
      (Date.now() - (new Date(job.run_at) ?? new Date(job.created_at)).getTime()) / 1000,
    );
  });

  events.on('job:error', ({ job }) => {
    jobErrorCounter.inc({ task_identifier: job.task_identifier });
  });

  events.on('job:success', ({ job }) => {
    jobSuccessCounter.inc({ task_identifier: job.task_identifier });
  });

  events.on('job:failed', ({ job }) => {
    jobFailedCounter.inc({ task_identifier: job.task_identifier });
  });

  events.on('worker:fatalError', () => {
    workerFatalErrorCounter.inc();
  });

  return events;
}
