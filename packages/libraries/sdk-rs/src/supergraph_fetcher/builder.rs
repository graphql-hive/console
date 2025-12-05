use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderValue};
use retry_policies::policies::ExponentialBackoff;

use crate::{
    agent::usage_agent::non_empty_string, circuit_breaker::CircuitBreakerBuilder,
    supergraph_fetcher::SupergraphFetcherError,
};

pub struct SupergraphFetcherBuilder {
    pub(crate) endpoints: Vec<String>,
    pub(crate) key: Option<String>,
    pub(crate) user_agent: Option<String>,
    pub(crate) connect_timeout: Duration,
    pub(crate) request_timeout: Duration,
    pub(crate) accept_invalid_certs: bool,
    pub(crate) retry_policy: ExponentialBackoff,
    pub(crate) circuit_breaker: CircuitBreakerBuilder,
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

    pub(crate) fn validate_endpoints(&self) -> Result<(), SupergraphFetcherError> {
        if self.endpoints.is_empty() {
            return Err(SupergraphFetcherError::MissingConfigurationOption(
                "endpoint".to_string(),
            ));
        }
        Ok(())
    }

    pub(crate) fn prepare_headers(&self) -> Result<HeaderMap, SupergraphFetcherError> {
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
}
