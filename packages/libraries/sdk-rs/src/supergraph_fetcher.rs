use std::fmt::Display;
use std::sync::RwLock;
use std::time::Duration;
use std::time::SystemTime;

use crate::agent::usage_agent::non_empty_string;
use recloser::AsyncRecloser;
use recloser::Recloser;
use reqwest::header::HeaderMap;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;
use reqwest::header::IF_NONE_MATCH;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::RetryDecision;
use reqwest_retry::RetryPolicy;
use reqwest_retry::RetryTransientMiddleware;
use retry_policies::policies::ExponentialBackoff;

use crate::circuit_breaker::CircuitBreakerBuilder;

#[derive(Debug)]
pub struct SupergraphFetcher<AsyncOrSync> {
    client: SupergraphFetcherAsyncOrSyncClient,
    etag: RwLock<Option<HeaderValue>>,
    state: std::marker::PhantomData<AsyncOrSync>,
}

#[derive(Debug)]
pub struct SupergraphFetcherAsyncState;
#[derive(Debug)]
pub struct SupergraphFetcherSyncState;

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

pub enum SupergraphFetcherError {
    FetcherCreationError(reqwest::Error),
    NetworkError(reqwest_middleware::Error),
    NetworkResponseError(reqwest::Error),
    Lock(String),
    InvalidKey(InvalidHeaderValue),
    MissingConfigurationOption(String),
    RejectedByCircuitBreaker,
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
        }
    }
}

impl SupergraphFetcher<SupergraphFetcherSyncState> {
    fn fetch_from_endpoint(
        &self,
        reqwest_client: &reqwest::blocking::Client,
        endpoint: &str,
        circuit_breaker: &Recloser,
        retry_policy: &ExponentialBackoff,
    ) -> Result<reqwest::blocking::Response, SupergraphFetcherError> {
        circuit_breaker
            .call(|| {
                let request_start_time = SystemTime::now();
                // Implementing retry logic for sync client
                let mut n_past_retries = 0;
                loop {
                    let mut req = reqwest_client.get(endpoint);
                    let etag = self.get_latest_etag()?;
                    if let Some(etag) = etag {
                        req = req.header(IF_NONE_MATCH, etag);
                    }
                    let response = req.send();

                    match response {
                        Ok(resp) => break Ok(resp),
                        Err(e) => {
                            match retry_policy.should_retry(request_start_time, n_past_retries) {
                                RetryDecision::DoNotRetry => {
                                    return Err(SupergraphFetcherError::NetworkError(
                                        reqwest_middleware::Error::Reqwest(e),
                                    ));
                                }
                                RetryDecision::Retry { execute_after } => {
                                    n_past_retries += 1;
                                    if let Ok(duration) = execute_after.elapsed() {
                                        std::thread::sleep(duration);
                                    }
                                }
                            }
                        }
                    }
                }
            })
            .map_err(|e| match e {
                recloser::Error::Inner(e) => e,
                recloser::Error::Rejected => SupergraphFetcherError::RejectedByCircuitBreaker,
            })
    }
    pub fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let (endpoints_with_circuit_breakers, reqwest_client, retry_policy) = match &self.client {
            SupergraphFetcherAsyncOrSyncClient::Sync {
                endpoints_with_circuit_breakers,
                reqwest_client,
                retry_policy,
            } => (
                endpoints_with_circuit_breakers,
                reqwest_client,
                retry_policy,
            ),
            _ => unreachable!(),
        };
        let mut last_error: Option<SupergraphFetcherError> = None;
        let mut last_resp = None;
        for (endpoint, circuit_breaker) in endpoints_with_circuit_breakers {
            let resp =
                self.fetch_from_endpoint(reqwest_client, endpoint, circuit_breaker, retry_policy);
            match resp {
                Err(e) => {
                    last_error = Some(e);
                    continue;
                }
                Ok(resp) => {
                    last_resp = Some(resp);
                    break;
                }
            }
        }

        if let Some(last_resp) = last_resp {
            if last_resp.status().as_u16() == 304 {
                return Ok(None);
            }
            self.update_latest_etag(last_resp.headers().get("etag"))?;
            let text = last_resp
                .text()
                .map_err(SupergraphFetcherError::NetworkResponseError)?;
            Ok(Some(text))
        } else if let Some(error) = last_error {
            Err(error)
        } else {
            Ok(None)
        }
    }
}

impl SupergraphFetcher<SupergraphFetcherAsyncState> {
    pub async fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let (endpoints_with_circuit_breakers, reqwest_client) = match &self.client {
            SupergraphFetcherAsyncOrSyncClient::Async {
                endpoints_with_circuit_breakers,
                reqwest_client,
            } => (endpoints_with_circuit_breakers, reqwest_client),
            _ => unreachable!(),
        };
        let mut last_error: Option<SupergraphFetcherError> = None;
        let mut last_resp = None;
        for (endpoint, circuit_breaker) in endpoints_with_circuit_breakers {
            let mut req = reqwest_client.get(endpoint);
            let etag = self.get_latest_etag()?;
            if let Some(etag) = etag {
                req = req.header(IF_NONE_MATCH, etag);
            }
            let resp = circuit_breaker.call(req.send()).await;
            match resp {
                Err(recloser::Error::Inner(e)) => {
                    last_error = Some(SupergraphFetcherError::NetworkError(e));
                    continue;
                }
                Err(recloser::Error::Rejected) => {
                    last_error = Some(SupergraphFetcherError::RejectedByCircuitBreaker);
                    continue;
                }
                Ok(resp) => {
                    last_resp = Some(resp);
                    break;
                }
            }
        }

        if let Some(last_resp) = last_resp {
            let etag = last_resp.headers().get("etag");
            self.update_latest_etag(etag)?;
            let text = last_resp
                .text()
                .await
                .map_err(SupergraphFetcherError::NetworkResponseError)?;
            Ok(Some(text))
        } else if let Some(error) = last_error {
            Err(error)
        } else {
            Ok(None)
        }
    }
}

impl<AsyncOrSync> SupergraphFetcher<AsyncOrSync> {
    fn get_latest_etag(&self) -> Result<Option<HeaderValue>, SupergraphFetcherError> {
        let guard: std::sync::RwLockReadGuard<'_, Option<HeaderValue>> =
            self.etag.try_read().map_err(|e| {
                SupergraphFetcherError::Lock(format!("Failed to read the etag record: {:?}", e))
            })?;

        Ok(guard.clone())
    }

    fn update_latest_etag(&self, etag: Option<&HeaderValue>) -> Result<(), SupergraphFetcherError> {
        let mut guard: std::sync::RwLockWriteGuard<'_, Option<HeaderValue>> =
            self.etag.try_write().map_err(|e| {
                SupergraphFetcherError::Lock(format!("Failed to update the etag record: {:?}", e))
            })?;

        if let Some(etag_value) = etag {
            *guard = Some(etag_value.clone());
        } else {
            *guard = None;
        }

        Ok(())
    }
}

pub struct SupergraphFetcherBuilder {
    endpoints: Vec<String>,
    key: Option<String>,
    user_agent: Option<String>,
    connect_timeout: Duration,
    request_timeout: Duration,
    accept_invalid_certs: bool,
    retry_policy: ExponentialBackoff,
    circuit_breaker: CircuitBreakerBuilder,
}

impl Default for SupergraphFetcherBuilder {
    fn default() -> Self {
        Self {
            endpoints: vec![],
            key: None,
            user_agent: None,
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(60),
            accept_invalid_certs: false,
            retry_policy: ExponentialBackoff::builder().build_with_max_retries(3),
            circuit_breaker: CircuitBreakerBuilder::default(),
        }
    }
}

impl SupergraphFetcherBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    /// The CDN endpoint from Hive Console target.
    pub fn add_endpoint(mut self, endpoint: String) -> Self {
        if let Some(mut endpoint) = non_empty_string(Some(endpoint)) {
            if !endpoint.ends_with("/supergraph") {
                if endpoint.ends_with("/") {
                    endpoint.push_str("supergraph");
                } else {
                    endpoint.push_str("/supergraph");
                }
            }
            self.endpoints.push(endpoint);
        }
        self
    }

    /// The CDN Access Token with from the Hive Console target.
    pub fn key(mut self, key: String) -> Self {
        self.key = Some(key);
        self
    }

    /// User-Agent header to be sent with each request
    pub fn user_agent(mut self, user_agent: String) -> Self {
        self.user_agent = Some(user_agent);
        self
    }

    /// Connection timeout for the Hive Console CDN requests.
    /// Default: 5 seconds
    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    /// Request timeout for the Hive Console CDN requests.
    /// Default: 60 seconds
    pub fn request_timeout(mut self, timeout: Duration) -> Self {
        self.request_timeout = timeout;
        self
    }

    pub fn accept_invalid_certs(mut self, accept: bool) -> Self {
        self.accept_invalid_certs = accept;
        self
    }

    /// Policy for retrying failed requests.
    ///
    /// By default, an exponential backoff retry policy is used, with 10 attempts.
    pub fn retry_policy(mut self, retry_policy: ExponentialBackoff) -> Self {
        self.retry_policy = retry_policy;
        self
    }

    /// Maximum number of retries for failed requests.
    ///
    /// By default, an exponential backoff retry policy is used, with 10 attempts.
    pub fn max_retries(mut self, max_retries: u32) -> Self {
        self.retry_policy = ExponentialBackoff::builder().build_with_max_retries(max_retries);
        self
    }

    fn validate_endpoints(&self) -> Result<(), SupergraphFetcherError> {
        if self.endpoints.is_empty() {
            return Err(SupergraphFetcherError::MissingConfigurationOption(
                "endpoint".to_string(),
            ));
        }
        Ok(())
    }

    fn prepare_headers(&self) -> Result<HeaderMap, SupergraphFetcherError> {
        let key = match &self.key {
            Some(key) => key,
            None => {
                return Err(SupergraphFetcherError::MissingConfigurationOption(
                    "key".to_string(),
                ))
            }
        };
        let mut headers = HeaderMap::new();
        let mut cdn_key_header =
            HeaderValue::from_str(key).map_err(SupergraphFetcherError::InvalidKey)?;
        cdn_key_header.set_sensitive(true);
        headers.insert("X-Hive-CDN-Key", cdn_key_header);

        Ok(headers)
    }

    /// Builds a synchronous SupergraphFetcher
    pub fn build_sync(
        self,
    ) -> Result<SupergraphFetcher<SupergraphFetcherSyncState>, SupergraphFetcherError> {
        self.validate_endpoints()?;
        let headers = self.prepare_headers()?;

        let mut reqwest_client = reqwest::blocking::Client::builder()
            .danger_accept_invalid_certs(self.accept_invalid_certs)
            .connect_timeout(self.connect_timeout)
            .timeout(self.request_timeout)
            .default_headers(headers);

        if let Some(user_agent) = &self.user_agent {
            reqwest_client = reqwest_client.user_agent(user_agent);
        }

        let reqwest_client = reqwest_client
            .build()
            .map_err(SupergraphFetcherError::FetcherCreationError)?;
        let fetcher: SupergraphFetcher<SupergraphFetcherSyncState> = SupergraphFetcher {
            client: SupergraphFetcherAsyncOrSyncClient::Sync {
                reqwest_client,
                retry_policy: self.retry_policy,
                endpoints_with_circuit_breakers: self
                    .endpoints
                    .into_iter()
                    .map(|endpoint| {
                        let circuit_breaker = self.circuit_breaker.clone().build_sync().unwrap();
                        (endpoint, circuit_breaker)
                    })
                    .collect(),
            },
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        };
        Ok(fetcher)
    }

    /// Builds an asynchronous SupergraphFetcher
    pub fn build_async(
        self,
    ) -> Result<SupergraphFetcher<SupergraphFetcherAsyncState>, SupergraphFetcherError> {
        self.validate_endpoints()?;

        let headers = self.prepare_headers()?;

        let mut reqwest_agent = reqwest::Client::builder()
            .danger_accept_invalid_certs(self.accept_invalid_certs)
            .connect_timeout(self.connect_timeout)
            .timeout(self.request_timeout)
            .default_headers(headers);

        if let Some(user_agent) = self.user_agent {
            reqwest_agent = reqwest_agent.user_agent(user_agent);
        }

        let reqwest_agent = reqwest_agent
            .build()
            .map_err(SupergraphFetcherError::FetcherCreationError)?;
        let reqwest_client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(self.retry_policy))
            .build();

        Ok(SupergraphFetcher {
            client: SupergraphFetcherAsyncOrSyncClient::Async {
                reqwest_client,
                endpoints_with_circuit_breakers: self
                    .endpoints
                    .into_iter()
                    .map(|endpoint| {
                        let circuit_breaker = self.circuit_breaker.clone().build_async().unwrap();
                        (endpoint, circuit_breaker)
                    })
                    .collect(),
            },
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        })
    }
}
