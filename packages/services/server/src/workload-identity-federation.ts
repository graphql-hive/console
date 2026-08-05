import { readFile } from 'node:fs/promises';
import type { FastifyBaseLogger } from 'fastify';

const DEFAULT_POLL_INTERVAL_MS = 60_000;

/**
 * Polls the workload identity federation token file at a regular interval and
 * keeps the current token in memory so it can be used without a per-request
 * file read.
 *
 * Supports Azure Workload Identity today; additional providers can be added in
 * the future by extending the `provider` discriminant.
 */
export class WorkloadIdentityFederationProvider {
  private currentToken: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly tokenFilePath: string,
    private readonly logger: FastifyBaseLogger,
    private readonly pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
  ) {}

  /** Read the token file once and start the polling interval. */
  async start(): Promise<void> {
    await this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, this.pollIntervalMs);
    // Prevent the interval from keeping the process alive on its own.
    this.timer.unref();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Returns the most recently cached token, or null if not yet loaded. */
  getToken(): string | null {
    return this.currentToken;
  }

  private async refresh(): Promise<void> {
    try {
      this.currentToken = (await readFile(this.tokenFilePath, 'utf-8')).trim();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to read workload identity federation token file (path=%s)',
        this.tokenFilePath,
      );
    }
  }
}
