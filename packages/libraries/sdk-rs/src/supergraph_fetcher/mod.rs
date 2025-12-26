use std::fmt::Display;
use tokio::sync::RwLock;

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

pub enum SupergraphFetcherError {
    FetcherCreationError(reqwest::Error),
    NetworkError(reqwest_middleware::Error),
    NetworkResponseError(reqwest::Error),
    Lock(String),
    InvalidKey(InvalidHeaderValue),
    MissingConfigurationOption(String),
    RejectedByCircuitBreaker,
    CircuitBreakerCreationError(CircuitBreakerError),
}

impl Display for SupergraphFetcherError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SupergraphFetcherError::FetcherCreationError(e) => {
                write!(f, "Creating fetcher failed: {}", e)
            }
            SupergraphFetcherError::NetworkError(e) => write!(f, "Network error: {}", e),
            SupergraphFetcherError::NetworkResponseError(e) => {
                write!(f, "Network response error: {}", e)
            }
            SupergraphFetcherError::Lock(e) => write!(f, "Lock error: {}", e),
            SupergraphFetcherError::InvalidKey(e) => write!(f, "Invalid CDN key: {}", e),
            SupergraphFetcherError::MissingConfigurationOption(e) => {
                write!(f, "Missing configuration option: {}", e)
            }
            SupergraphFetcherError::RejectedByCircuitBreaker => {
                write!(f, "Request rejected by circuit breaker")
            }
            SupergraphFetcherError::CircuitBreakerCreationError(e) => {
                write!(f, "Creating circuit breaker failed: {}", e)
            }
        }
    }
}
