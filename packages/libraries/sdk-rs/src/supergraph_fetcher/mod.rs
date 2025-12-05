use std::fmt::Display;
use tokio::sync::RwLock;

use crate::circuit_breaker::CircuitBreakerError;
use crate::supergraph_fetcher::async_::SupergraphFetcherAsyncState;
use recloser::AsyncRecloser;
use recloser::Recloser;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;
use reqwest_middleware::ClientWithMiddleware;
use retry_policies::policies::ExponentialBackoff;

pub mod async_;
pub mod builder;
pub mod sync;

#[derive(Debug)]
pub struct SupergraphFetcher<AsyncOrSync> {
    client: SupergraphFetcherAsyncOrSyncClient,
    etag: RwLock<Option<HeaderValue>>,
    state: std::marker::PhantomData<AsyncOrSync>,
}

#[derive(Debug)]
enum SupergraphFetcherAsyncOrSyncClient {
    Async {
        endpoints_with_circuit_breakers: Vec<(String, AsyncRecloser)>,
        reqwest_client: ClientWithMiddleware,
    },
    Sync {
        endpoints_with_circuit_breakers: Vec<(String, Recloser)>,
        reqwest_client: reqwest::blocking::Client,
        retry_policy: ExponentialBackoff,
    },
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
