use std::fmt::Display;
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

pub enum SupergraphFetcherError {
    HTTPClientCreation(reqwest::Error),
    Network(reqwest_middleware::Error),
    ResponseParse(reqwest::Error),
    ETagRead(TryLockError),
    ETagWrite(TryLockError),
    InvalidKey(InvalidHeaderValue),
    MissingConfigurationOption(String),
    RejectedByCircuitBreaker,
    CircuitBreakerCreation(CircuitBreakerError),
}

impl Display for SupergraphFetcherError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SupergraphFetcherError::HTTPClientCreation(e) => {
                write!(f, "Creating HTTP Client failed: {}", e)
            }
            SupergraphFetcherError::Network(e) => write!(f, "Network error: {}", e),
            SupergraphFetcherError::ResponseParse(e) => {
                write!(f, "Parsing response failed: {}", e)
            }
            SupergraphFetcherError::ETagRead(e) => {
                write!(f, "Reading the etag record failed: {:?}", e)
            }
            SupergraphFetcherError::ETagWrite(e) => {
                write!(f, "Updating the etag record failed: {:?}", e)
            }
            SupergraphFetcherError::InvalidKey(e) => write!(f, "Invalid CDN key: {}", e),
            SupergraphFetcherError::MissingConfigurationOption(e) => {
                write!(f, "Missing configuration option: {}", e)
            }
            SupergraphFetcherError::RejectedByCircuitBreaker => {
                write!(f, "Request rejected by circuit breaker")
            }
            SupergraphFetcherError::CircuitBreakerCreation(e) => {
                write!(f, "Creating circuit breaker failed: {}", e)
            }
        }
    }
}
