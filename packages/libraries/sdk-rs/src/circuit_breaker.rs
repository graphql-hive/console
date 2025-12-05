use std::time::Duration;

use recloser::{AsyncRecloser, Recloser};

#[derive(Clone)]
pub struct CircuitBreakerBuilder {
    error_threshold: f32,
    volume_threshold: usize,
    reset_timeout: Duration,
}

impl Default for CircuitBreakerBuilder {
    fn default() -> Self {
        Self {
            error_threshold: 0.5,
            volume_threshold: 5,
            reset_timeout: Duration::from_secs(30),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CircuitBreakerError {
    #[error("Invalid error threshold: {0}. It must be between 0.0 and 1.0")]
    InvalidErrorThreshold(f32),
}

impl CircuitBreakerBuilder {
    /// Percentage after what the circuit breaker should kick in.
    /// Default: .5
    pub fn error_threshold(mut self, percentage: f32) -> Self {
        self.error_threshold = percentage;
        self
    }
    /// Count of requests before starting evaluating.
    /// Default: 5
    pub fn volume_threshold(mut self, threshold: usize) -> Self {
        self.volume_threshold = threshold;
        self
    }
    /// After what time the circuit breaker is attempting to retry sending requests in milliseconds.
    /// Default: 30s
    pub fn reset_timeout(mut self, timeout: Duration) -> Self {
        self.reset_timeout = timeout;
        self
    }

    pub fn build_async(self) -> Result<AsyncRecloser, CircuitBreakerError> {
        let recloser = self.build_sync()?;
        Ok(AsyncRecloser::from(recloser))
    }
    pub fn build_sync(self) -> Result<Recloser, CircuitBreakerError> {
        let error_threshold = if self.error_threshold < 0.0 || self.error_threshold > 1.0 {
            return Err(CircuitBreakerError::InvalidErrorThreshold(
                self.error_threshold,
            ));
        } else {
            self.error_threshold
        };
        let recloser = Recloser::custom()
            .error_rate(error_threshold)
            .closed_len(self.volume_threshold)
            .open_wait(self.reset_timeout)
            .build();
        Ok(recloser)
    }
}
