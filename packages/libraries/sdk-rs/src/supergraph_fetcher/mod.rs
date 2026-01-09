use tokio::sync::RwLock;
use tokio::sync::TryLockError;

use crate::circuit_breaker::CircuitBreakerError;
use crate::supergraph_fetcher::async_::SupergraphFetcherAsyncState;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;

pub mod async_;
pub mod builder;
pub mod sync;

#[derive(Debug)]
pub struct SupergraphFetcher<State> {
    state: State,
    etag: RwLock<Option<HeaderValue>>,
}

// Doesn't matter which one we implement this for, both have the same builder
impl SupergraphFetcher<SupergraphFetcherAsyncState> {
    pub fn builder() -> builder::SupergraphFetcherBuilder {
        builder::SupergraphFetcherBuilder::default()
    }
}

pub enum LockErrorType {
    Read,
    Write,
}

#[derive(Debug, thiserror::Error)]
pub enum SupergraphFetcherError {
    #[error("Creating HTTP Client failed: {0}")]
    HTTPClientCreation(reqwest::Error),
    #[error("Network error: {0}")]
    Network(reqwest_middleware::Error),
    #[error("Parsing response failed: {0}")]
    ResponseParse(reqwest::Error),
    #[error("Reading the etag record failed: {0:?}")]
    ETagRead(TryLockError),
    #[error("Updating the etag record failed: {0:?}")]
    ETagWrite(TryLockError),
    #[error("Invalid CDN key: {0}")]
    InvalidKey(InvalidHeaderValue),
    #[error("Missing configuration option: {0}")]
    MissingConfigurationOption(String),
    #[error("Request rejected by circuit breaker")]
    RejectedByCircuitBreaker,
    #[error("Creating circuit breaker failed: {0}")]
    CircuitBreakerCreation(CircuitBreakerError),
}
