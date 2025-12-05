use std::time::Duration;

use crate::agent::usage_agent::non_empty_string;
use crate::circuit_breaker::CircuitBreakerBuilder;
use moka::future::Cache;
use recloser::AsyncRecloser;
use reqwest::header::HeaderMap;
use reqwest::header::HeaderValue;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::RetryTransientMiddleware;
use retry_policies::policies::ExponentialBackoff;
use tracing::{debug, info, warn};

#[derive(Debug)]
pub struct PersistedDocumentsManager {
    client: ClientWithMiddleware,
    cache: Cache<String, String>,
    endpoints_with_circuit_breakers: Vec<(String, AsyncRecloser)>,
}

#[derive(Debug, thiserror::Error)]
pub enum PersistedDocumentsError {
    #[error("Failed to read body: {0}")]
    FailedToReadBody(String),
    #[error("Failed to parse body: {0}")]
    FailedToParseBody(serde_json::Error),
    #[error("Persisted document not found.")]
    DocumentNotFound,
    #[error("Failed to locate the persisted document key in request.")]
    KeyNotFound,
    #[error("Failed to validate persisted document")]
    FailedToFetchFromCDN(reqwest_middleware::Error),
    #[error("Failed to read CDN response body")]
    FailedToReadCDNResponse(reqwest::Error),
    #[error("No persisted document provided, or document id cannot be resolved.")]
    PersistedDocumentRequired,
    #[error("Missing required configuration option: {0}")]
    MissingConfigurationOption(String),
    #[error("Invalid CDN key {0}")]
    InvalidCDNKey(String),
    #[error("Failed to create HTTP client: {0}")]
    HTTPClientCreationError(reqwest::Error),
    #[error("unable to create circuit breaker: {0}")]
    CircuitBreakerCreationError(#[from] crate::circuit_breaker::CircuitBreakerError),
    #[error("rejected by the circuit breaker")]
    CircuitBreakerRejected,
    #[error("unknown error")]
    Unknown,
}

impl PersistedDocumentsError {
    pub fn message(&self) -> String {
        self.to_string()
    }

    pub fn code(&self) -> String {
        match self {
            PersistedDocumentsError::FailedToReadBody(_) => "FAILED_TO_READ_BODY".into(),
            PersistedDocumentsError::FailedToParseBody(_) => "FAILED_TO_PARSE_BODY".into(),
            PersistedDocumentsError::DocumentNotFound => "PERSISTED_DOCUMENT_NOT_FOUND".into(),
            PersistedDocumentsError::KeyNotFound => "PERSISTED_DOCUMENT_KEY_NOT_FOUND".into(),
            PersistedDocumentsError::FailedToFetchFromCDN(_) => "FAILED_TO_FETCH_FROM_CDN".into(),
            PersistedDocumentsError::FailedToReadCDNResponse(_) => {
                "FAILED_TO_READ_CDN_RESPONSE".into()
            }
            PersistedDocumentsError::PersistedDocumentRequired => {
                "PERSISTED_DOCUMENT_REQUIRED".into()
            }
            PersistedDocumentsError::MissingConfigurationOption(_) => {
                "MISSING_CONFIGURATION_OPTION".into()
            }
            PersistedDocumentsError::InvalidCDNKey(_) => "INVALID_CDN_KEY".into(),
            PersistedDocumentsError::HTTPClientCreationError(_) => {
                "HTTP_CLIENT_CREATION_ERROR".into()
            }
            PersistedDocumentsError::CircuitBreakerCreationError(_) => {
                "CIRCUIT_BREAKER_CREATION_ERROR".into()
            }
            PersistedDocumentsError::CircuitBreakerRejected => "CIRCUIT_BREAKER_REJECTED".into(),
            PersistedDocumentsError::Unknown => "UNKNOWN_ERROR".into(),
        }
    }
}

impl PersistedDocumentsManager {
    pub fn builder() -> PersistedDocumentsManagerBuilder {
        PersistedDocumentsManagerBuilder::default()
    }
    async fn resolve_from_endpoint(
        &self,
        endpoint: &str,
        document_id: &str,
        circuit_breaker: &AsyncRecloser,
    ) -> Result<String, PersistedDocumentsError> {
        let cdn_document_id = str::replace(document_id, "~", "/");
        let cdn_artifact_url = format!("{}/apps/{}", endpoint, cdn_document_id);
        info!(
            "Fetching document {} from CDN: {}",
            document_id, cdn_artifact_url
        );
        let response_fut = self.client.get(cdn_artifact_url).send();

        let response = circuit_breaker
            .call(response_fut)
            .await
            .map_err(|e| match e {
                recloser::Error::Inner(e) => PersistedDocumentsError::FailedToFetchFromCDN(e),
                recloser::Error::Rejected => PersistedDocumentsError::CircuitBreakerRejected,
            })?;

        if response.status().is_success() {
            let document = response
                .text()
                .await
                .map_err(PersistedDocumentsError::FailedToReadCDNResponse)?;
            debug!(
                "Document fetched from CDN: {}, storing in local cache",
                document
            );
            self.cache
                .insert(document_id.into(), document.clone())
                .await;

            return Ok(document);
        }

        warn!(
            "Document fetch from CDN failed: HTTP {}, Body: {:?}",
            response.status(),
            response
                .text()
                .await
                .unwrap_or_else(|_| "Unavailable".to_string())
        );

        Err(PersistedDocumentsError::DocumentNotFound)
    }
    /// Resolves the document from the cache, or from the CDN
    pub async fn resolve_document(
        &self,
        document_id: &str,
    ) -> Result<String, PersistedDocumentsError> {
        let cached_record = self.cache.get(document_id).await;

        match cached_record {
            Some(document) => {
                debug!("Document {} found in cache: {}", document_id, document);

                Ok(document)
            }
            None => {
                debug!(
                    "Document {} not found in cache. Fetching from CDN",
                    document_id
                );
                let mut last_error: Option<PersistedDocumentsError> = None;
                for (endpoint, circuit_breaker) in &self.endpoints_with_circuit_breakers {
                    let result = self
                        .resolve_from_endpoint(endpoint, document_id, circuit_breaker)
                        .await;
                    match result {
                        Ok(document) => return Ok(document),
                        Err(e) => {
                            last_error = Some(e);
                        }
                    }
                }
                match last_error {
                    Some(e) => Err(e),
                    None => Err(PersistedDocumentsError::Unknown),
                }
            }
        }
    }
}

pub struct PersistedDocumentsManagerBuilder {
    key: Option<String>,
    endpoints: Vec<String>,
    accept_invalid_certs: bool,
    connect_timeout: Duration,
    request_timeout: Duration,
    retry_policy: ExponentialBackoff,
    cache_size: u64,
    user_agent: Option<String>,
    circuit_breaker: CircuitBreakerBuilder,
}

impl Default for PersistedDocumentsManagerBuilder {
    fn default() -> Self {
        Self {
            key: None,
            endpoints: vec![],
            accept_invalid_certs: false,
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(15),
            retry_policy: ExponentialBackoff::builder().build_with_max_retries(3),
            cache_size: 10_000,
            user_agent: None,
            circuit_breaker: CircuitBreakerBuilder::default(),
        }
    }
}

impl PersistedDocumentsManagerBuilder {
    /// The CDN Access Token with from the Hive Console target.
    pub fn key(mut self, key: String) -> Self {
        self.key = non_empty_string(Some(key));
        self
    }

    /// The CDN endpoint from Hive Console target.
    pub fn add_endpoint(mut self, endpoint: String) -> Self {
        if let Some(endpoint) = non_empty_string(Some(endpoint)) {
            self.endpoints.push(endpoint);
        }
        self
    }

    /// Accept invalid SSL certificates
    /// default: false
    pub fn accept_invalid_certs(mut self, accept_invalid_certs: bool) -> Self {
        self.accept_invalid_certs = accept_invalid_certs;
        self
    }

    /// Connection timeout for the Hive Console CDN requests.
    /// Default: 5 seconds
    pub fn connect_timeout(mut self, connect_timeout: Duration) -> Self {
        self.connect_timeout = connect_timeout;
        self
    }

    /// Request timeout for the Hive Console CDN requests.
    /// Default: 15 seconds
    pub fn request_timeout(mut self, request_timeout: Duration) -> Self {
        self.request_timeout = request_timeout;
        self
    }

    /// Retry policy for fetching persisted documents
    /// Default: ExponentialBackoff with max 3 retries
    pub fn retry_policy(mut self, retry_policy: ExponentialBackoff) -> Self {
        self.retry_policy = retry_policy;
        self
    }

    /// Maximum number of retries for fetching persisted documents
    /// Default: ExponentialBackoff with max 3 retries
    pub fn max_retries(mut self, max_retries: u32) -> Self {
        self.retry_policy = ExponentialBackoff::builder().build_with_max_retries(max_retries);
        self
    }

    /// Size of the in-memory cache for persisted documents
    /// Default: 10,000 entries
    pub fn cache_size(mut self, cache_size: u64) -> Self {
        self.cache_size = cache_size;
        self
    }

    /// User-Agent header to be sent with each request
    pub fn user_agent(mut self, user_agent: String) -> Self {
        self.user_agent = non_empty_string(Some(user_agent));
        self
    }

    pub fn build(self) -> Result<PersistedDocumentsManager, PersistedDocumentsError> {
        let mut default_headers = HeaderMap::new();
        let key = match self.key {
            Some(key) => key,
            None => {
                return Err(PersistedDocumentsError::MissingConfigurationOption(
                    "key".to_string(),
                ));
            }
        };
        default_headers.insert(
            "X-Hive-CDN-Key",
            HeaderValue::from_str(&key)
                .map_err(|e| PersistedDocumentsError::InvalidCDNKey(e.to_string()))?,
        );
        let mut reqwest_agent = reqwest::Client::builder()
            .danger_accept_invalid_certs(self.accept_invalid_certs)
            .connect_timeout(self.connect_timeout)
            .timeout(self.request_timeout)
            .default_headers(default_headers);

        if let Some(user_agent) = self.user_agent {
            reqwest_agent = reqwest_agent.user_agent(user_agent);
        }

        let reqwest_agent = reqwest_agent
            .build()
            .map_err(PersistedDocumentsError::HTTPClientCreationError)?;
        let client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(self.retry_policy))
            .build();

        let cache = Cache::<String, String>::new(self.cache_size);

        if self.endpoints.is_empty() {
            return Err(PersistedDocumentsError::MissingConfigurationOption(
                "endpoints".to_string(),
            ));
        }

        Ok(PersistedDocumentsManager {
            client,
            cache,
            endpoints_with_circuit_breakers: self
                .endpoints
                .into_iter()
                .map(move |endpoint| {
                    let circuit_breaker = self
                        .circuit_breaker
                        .clone()
                        .build_async()
                        .map_err(PersistedDocumentsError::CircuitBreakerCreationError)?;
                    Ok((endpoint, circuit_breaker))
                })
                .collect::<Result<Vec<(String, AsyncRecloser)>, PersistedDocumentsError>>()?,
        })
    }
}
