use std::time::Duration;

use crate::agent::usage_agent::non_empty_string;
use moka::future::Cache;
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
    endpoint: String,
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
        }
    }
}

impl PersistedDocumentsManager {
    pub fn builder() -> PersistedDocumentsManagerBuilder {
        PersistedDocumentsManagerBuilder::default()
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
                let cdn_document_id = str::replace(document_id, "~", "/");
                let cdn_artifact_url = format!("{}/apps/{}", &self.endpoint, cdn_document_id);
                info!(
                    "Fetching document {} from CDN: {}",
                    document_id, cdn_artifact_url
                );
                let cdn_response = self.client.get(cdn_artifact_url).send().await;

                match cdn_response {
                    Ok(response) => {
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
                    Err(e) => {
                        warn!("Failed to fetch document from CDN: {:?}", e);

                        Err(PersistedDocumentsError::FailedToFetchFromCDN(e))
                    }
                }
            }
        }
    }
}

pub struct PersistedDocumentsManagerBuilder {
    key: Option<String>,
    endpoint: Option<String>,
    accept_invalid_certs: bool,
    connect_timeout: Duration,
    /// Request timeout for the Hive Console CDN requests.
    request_timeout: Duration,
    /// Interval at which the Hive Console should be retried upon failure.
    ///
    /// By default, an exponential backoff retry policy is used, with 3 attempts.
    retry_policy: ExponentialBackoff,
    /// Configuration for the size of the in-memory caching of persisted documents.
    cache_size: u64,
    /// User-Agent header to be sent with each request
    user_agent: Option<String>,
}

impl Default for PersistedDocumentsManagerBuilder {
    fn default() -> Self {
        Self {
            key: None,
            endpoint: None,
            accept_invalid_certs: false,
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(15),
            retry_policy: ExponentialBackoff::builder().build_with_max_retries(3),
            cache_size: 10_000,
            user_agent: None,
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
    pub fn endpoint(mut self, endpoint: String) -> Self {
        self.endpoint = non_empty_string(Some(endpoint));
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
        default_headers.insert("X-Hive-CDN-Key", HeaderValue::from_str(&key).unwrap());
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
            .expect("Failed to create reqwest client");
        let client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(self.retry_policy))
            .build();

        let cache = Cache::<String, String>::new(self.cache_size);

        let endpoint = match self.endpoint {
            Some(endpoint) => endpoint,
            None => {
                return Err(PersistedDocumentsError::MissingConfigurationOption(
                    "endpoint".to_string(),
                ));
            }
        };

        Ok(PersistedDocumentsManager {
            client,
            cache,
            endpoint,
        })
    }
}
