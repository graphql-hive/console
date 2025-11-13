use std::fmt::Display;
use std::sync::RwLock;
use std::time::Duration;

use reqwest::header::HeaderMap;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;
use reqwest::header::IF_NONE_MATCH;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::policies::ExponentialBackoff;
use reqwest_retry::RetryTransientMiddleware;

#[derive(Debug)]
pub struct SupergraphFetcherAsyncClient {
    reqwest_client: ClientWithMiddleware,
}

#[derive(Debug)]
pub struct SupergraphFetcherSyncClient {
    reqwest_client: reqwest::blocking::Client,
    retry_count: u32,
}

#[derive(Debug)]
pub struct SupergraphFetcher<AsyncOrSyncClient> {
    client: AsyncOrSyncClient,
    endpoint: String,
    etag: RwLock<Option<HeaderValue>>,
}

pub enum SupergraphFetcherError {
    FetcherCreationError(reqwest::Error),
    NetworkError(reqwest_middleware::Error),
    NetworkResponseError(reqwest::Error),
    HeadersLock(String),
    InvalidKey(InvalidHeaderValue),
    AsyncInSyncMode,
    SyncInAsyncMode,
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
            SupergraphFetcherError::HeadersLock(e) => write!(f, "Headers lock error: {}", e),
            SupergraphFetcherError::InvalidKey(e) => write!(f, "Invalid CDN key: {}", e),
            SupergraphFetcherError::AsyncInSyncMode => {
                write!(f, "Attempted to use async client in sync fetch")
            }
            SupergraphFetcherError::SyncInAsyncMode => {
                write!(f, "Attempted to use sync client in async fetch")
            }
        }
    }
}

fn prepare_endpoint_and_header(
    mut endpoint: String,
    key: &str,
) -> Result<(String, HeaderMap), SupergraphFetcherError> {
    if !endpoint.ends_with("/supergraph") {
        if endpoint.ends_with("/") {
            endpoint.push_str("supergraph");
        } else {
            endpoint.push_str("/supergraph");
        }
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        "X-Hive-CDN-Key",
        HeaderValue::from_str(key).map_err(SupergraphFetcherError::InvalidKey)?,
    );

    Ok((endpoint, headers))
}

impl SupergraphFetcher<SupergraphFetcherSyncClient> {
    #[allow(clippy::too_many_arguments)]
    pub fn try_new(
        endpoint: String,
        key: &str,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        retry_count: u32,
    ) -> Result<Self, SupergraphFetcherError> {
        let (endpoint, headers) = prepare_endpoint_and_header(endpoint, key)?;

        let client = SupergraphFetcherSyncClient {
            reqwest_client: reqwest::blocking::Client::builder()
                .danger_accept_invalid_certs(accept_invalid_certs)
                .connect_timeout(connect_timeout)
                .timeout(request_timeout)
                .user_agent(user_agent)
                .default_headers(headers)
                .build()
                .map_err(SupergraphFetcherError::FetcherCreationError)?,
            retry_count,
        };

        Ok(Self {
            client,
            endpoint,
            etag: RwLock::new(None),
        })
    }

    pub fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        // Implementing retry logic for sync client
        let mut attempts = 0;
        let resp = loop {
            let mut req = self.client.reqwest_client.get(&self.endpoint);
            let etag = self.get_latest_etag()?;
            if let Some(etag) = etag {
                req = req.header(IF_NONE_MATCH, etag);
            }
            let response = req.send();

            match response {
                Ok(resp) => break resp,
                Err(e) => {
                    attempts += 1;
                    if attempts > self.client.retry_count {
                        return Err(SupergraphFetcherError::NetworkError(
                            reqwest_middleware::Error::Reqwest(e),
                        ));
                    }
                    // Exponential backoff before retrying
                    let backoff_duration = Duration::from_millis(2u64.pow(attempts) * 100);
                    std::thread::sleep(backoff_duration);
                }
            }
        };

        if resp.status().as_u16() == 304 {
            return Ok(None);
        }

        let etag = resp.headers().get("etag");
        self.update_latest_etag(etag)?;

        let text = resp
            .text()
            .map_err(SupergraphFetcherError::NetworkResponseError)?;

        Ok(Some(text))
    }
}

impl SupergraphFetcher<SupergraphFetcherAsyncClient> {
    #[allow(clippy::too_many_arguments)]
    pub fn try_new(
        endpoint: String,
        key: &str,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        retry_count: u32,
    ) -> Result<Self, SupergraphFetcherError> {
        let (endpoint, headers) = prepare_endpoint_and_header(endpoint, key)?;

        let retry_policy = ExponentialBackoff::builder().build_with_max_retries(retry_count);
        let reqwest_agent = reqwest::Client::builder()
            .danger_accept_invalid_certs(accept_invalid_certs)
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .default_headers(headers)
            .user_agent(user_agent)
            .build()
            .map_err(SupergraphFetcherError::FetcherCreationError)?;
        let reqwest_client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();

        Ok(Self {
            client: SupergraphFetcherAsyncClient { reqwest_client },
            endpoint,
            etag: RwLock::new(None),
        })
    }
    pub async fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let mut req = self.client.reqwest_client.get(&self.endpoint);
        let etag = self.get_latest_etag()?;
        if let Some(etag) = etag {
            req = req.header(IF_NONE_MATCH, etag);
        }

        let resp = req
            .send()
            .await
            .map_err(SupergraphFetcherError::NetworkError)?;

        if resp.status().as_u16() == 304 {
            return Ok(None);
        }

        let etag = resp.headers().get("etag");
        self.update_latest_etag(etag)?;

        let text = resp
            .text()
            .await
            .map_err(SupergraphFetcherError::NetworkResponseError)?;

        Ok(Some(text))
    }
}

impl<AsyncOrSync> SupergraphFetcher<AsyncOrSync> {
    fn get_latest_etag(&self) -> Result<Option<HeaderValue>, SupergraphFetcherError> {
        let guard: std::sync::RwLockReadGuard<'_, Option<HeaderValue>> =
            self.etag.try_read().map_err(|e| {
                SupergraphFetcherError::HeadersLock(format!(
                    "Failed to read the etag record: {:?}",
                    e
                ))
            })?;

        Ok(guard.clone())
    }

    fn update_latest_etag(&self, etag: Option<&HeaderValue>) -> Result<(), SupergraphFetcherError> {
        let mut guard: std::sync::RwLockWriteGuard<'_, Option<HeaderValue>> =
            self.etag.try_write().map_err(|e| {
                SupergraphFetcherError::HeadersLock(format!(
                    "Failed to update the etag record: {:?}",
                    e
                ))
            })?;

        if let Some(etag_value) = etag {
            *guard = Some(etag_value.clone());
        } else {
            *guard = None;
        }

        Ok(())
    }
}
