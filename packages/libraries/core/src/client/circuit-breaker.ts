export type CircuitBreakerConfiguration = {
  /**
   * Percentage after what the circuit breaker should kick in.
   * Default: 50
   */
  errorThresholdPercentage: number;
  /**
   * Count of requests before starting evaluating.
   * Default: 5
   */
  volumeThreshold: number;
  /**
   * After what time the circuit breaker is attempting to retry sending requests in milliseconds
   * Default: 30_000
   */
  resetTimeout: number;
};

export const defaultCircuitBreakerConfiguration: CircuitBreakerConfiguration = {
  errorThresholdPercentage: 50,
  volumeThreshold: 10,
  resetTimeout: 30_000,
};
