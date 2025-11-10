use std::fmt::Display;
use std::sync::RwLock;
use std::time::Duration;

use reqwest::header::HeaderMap;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::policies::ExponentialBackoff;
use reqwest_retry::RetryTransientMiddleware;

#[derive(Debug)]
pub struct SupergraphFetcher {
    client: AsyncOrSyncClient,
    endpoint: String,
    headers: RwLock<HeaderMap>,
}

pub enum SupergraphFetcherError {
    FetcherCreationError(reqwest::Error),
    NetworkError(reqwest_middleware::Error),
    NetworkResponseError(reqwest::Error),
    HeadersLock(String),
    InvalidKey(InvalidHeaderValue),
    InvalidUserAgent(InvalidHeaderValue),
    AsyncInSyncMode,
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
            SupergraphFetcherError::InvalidUserAgent(e) => {
                write!(f, "Invalid user agent: {}", e)
            }
            SupergraphFetcherError::AsyncInSyncMode => {
                write!(f, "Attempted to use async client in sync fetch")
            }
        }
    }
}

pub enum FetcherMode {
    Async,
    Sync,
}

#[derive(Debug)]
enum AsyncOrSyncClient {
    Async(ClientWithMiddleware),
    Sync {
        client: reqwest::blocking::Client,
        retry_count: u32,
    },
}

impl SupergraphFetcher {
    #[allow(clippy::too_many_arguments)]
    pub fn try_new(
        endpoint: String,
        key: String,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        retry_count: u32,
        fetcher_mode: FetcherMode,
    ) -> Result<Self, SupergraphFetcherError> {
        let mut endpoint = endpoint;
        if !endpoint.ends_with("/supergraph") {
            if endpoint.ends_with("/") {
                endpoint.push_str("supergraph");
            } else {
                endpoint.push_str("/supergraph");
            }
        }

        let user_agent_value =
            HeaderValue::from_str(&user_agent).map_err(SupergraphFetcherError::InvalidUserAgent)?;

        let client = match fetcher_mode {
            FetcherMode::Async => {
                let retry_policy =
                    ExponentialBackoff::builder().build_with_max_retries(retry_count);
                let reqwest_agent = reqwest::Client::builder()
                    .danger_accept_invalid_certs(accept_invalid_certs)
                    .connect_timeout(connect_timeout)
                    .timeout(request_timeout)
                    .user_agent(user_agent_value.clone())
                    .build()
                    .map_err(SupergraphFetcherError::FetcherCreationError)?;
                let async_client = ClientBuilder::new(reqwest_agent)
                    .with(RetryTransientMiddleware::new_with_policy(retry_policy))
                    .build();
                AsyncOrSyncClient::Async(async_client)
            }
            FetcherMode::Sync => AsyncOrSyncClient::Sync {
                client: reqwest::blocking::Client::builder()
                    .danger_accept_invalid_certs(accept_invalid_certs)
                    .connect_timeout(connect_timeout)
                    .timeout(request_timeout)
                    .user_agent(user_agent_value.clone())
                    .build()
                    .map_err(SupergraphFetcherError::FetcherCreationError)?,
                retry_count,
            },
        };

        let mut headers = HeaderMap::new();
        headers.insert(
            "X-Hive-CDN-Key",
            HeaderValue::from_str(&key).map_err(SupergraphFetcherError::InvalidKey)?,
        );

        Ok(Self {
            client,
            endpoint,
            headers: RwLock::new(headers),
        })
    }

    pub fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let headers = self.get_headers()?;

        let (sync_client, retry_count) = match &self.client {
            AsyncOrSyncClient::Async(_) => {
                return Err(SupergraphFetcherError::AsyncInSyncMode);
            }
            AsyncOrSyncClient::Sync {
                client,
                retry_count,
            } => (client, retry_count),
        };

        // Implementing retry logic for sync client
        let mut attempts = 0;
        let resp = loop {
            let response = sync_client
                .get(&self.endpoint)
                .headers(headers.clone())
                .send();

            match response {
                Ok(resp) => break resp,
                Err(e) => {
                    attempts += 1;
                    if attempts > *retry_count {
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

    pub async fn fetch_supergraph_async(&self) -> Result<Option<String>, SupergraphFetcherError> {
        // Switch to sync fetch if the client is sync
        let async_client = match &self.client {
            AsyncOrSyncClient::Async(async_client) => async_client,
            AsyncOrSyncClient::Sync {
                client: _,
                retry_count: _,
            } => return self.fetch_supergraph(),
        };

        let headers = self.get_headers()?;

        let resp = async_client
            .get(&self.endpoint)
            .headers(headers)
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

    fn get_headers(&self) -> Result<HeaderMap, SupergraphFetcherError> {
        let guard = self.headers.try_read().map_err(|e| {
            SupergraphFetcherError::HeadersLock(format!("Failed to read the etag record: {:?}", e))
        })?;
        Ok(guard.clone())
    }

    fn update_latest_etag(&self, etag: Option<&HeaderValue>) -> Result<(), SupergraphFetcherError> {
        let mut guard = self.headers.try_write().map_err(|e| {
            SupergraphFetcherError::HeadersLock(format!(
                "Failed to update the etag record: {:?}",
                e
            ))
        })?;

        if let Some(etag_value) = etag {
            guard.insert("If-None-Match", etag_value.clone());
        } else {
            guard.remove("If-None-Match");
        }

        Ok(())
    }
}
