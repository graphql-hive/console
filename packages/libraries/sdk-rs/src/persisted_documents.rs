use std::time::Duration;

use moka::future::Cache;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use tracing::{debug, info, warn};

#[derive(Debug)]
pub struct PersistedDocumentsManager {
    agent: ClientWithMiddleware,
    cache: Cache<String, String>,
    endpoint: String,
    key: String,
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
        }
    }
}

impl PersistedDocumentsManager {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        key: String,
        endpoint: String,
        accept_invalid_certs: bool,
        connect_timeout: Duration,
        request_timeout: Duration,
        retry_count: u32,
        cache_size: u64,
    ) -> Self {
        let retry_policy = ExponentialBackoff::builder().build_with_max_retries(retry_count);

        let reqwest_agent = reqwest::Client::builder()
            .danger_accept_invalid_certs(accept_invalid_certs)
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .build()
            .expect("Failed to create reqwest client");
        let agent = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();

        let cache = Cache::<String, String>::new(cache_size);

        Self {
            agent,
            cache,
            endpoint,
            key,
        }
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
                let cdn_response = self
                    .agent
                    .get(cdn_artifact_url)
                    .header("X-Hive-CDN-Key", self.key.to_string())
                    .send()
                    .await;

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
