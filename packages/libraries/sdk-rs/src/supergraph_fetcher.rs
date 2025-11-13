use std::fmt::Display;
use std::sync::RwLock;
use std::time::Duration;
use std::time::SystemTime;

use reqwest::header::HeaderMap;
use reqwest::header::HeaderValue;
use reqwest::header::InvalidHeaderValue;
use reqwest::header::IF_NONE_MATCH;
use reqwest_middleware::ClientBuilder;
use reqwest_middleware::ClientWithMiddleware;
use reqwest_retry::policies::ExponentialBackoff;
use reqwest_retry::RetryDecision;
use reqwest_retry::RetryPolicy;
use reqwest_retry::RetryTransientMiddleware;

#[derive(Debug)]
pub struct SupergraphFetcher<AsyncOrSync> {
    client: SupergraphFetcherAsyncOrSyncClient,
    endpoint: String,
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
        reqwest_client: ClientWithMiddleware,
    },
    Sync {
        reqwest_client: reqwest::blocking::Client,
        retry_policy: ExponentialBackoff,
    },
}

pub enum SupergraphFetcherError {
    FetcherCreationError(reqwest::Error),
    NetworkError(reqwest_middleware::Error),
    NetworkResponseError(reqwest::Error),
    HeadersLock(String),
    InvalidKey(InvalidHeaderValue),
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
        }
    }
}

fn prepare_client_config(
    mut endpoint: String,
    key: &str,
    retry_count: u32,
) -> Result<(String, HeaderMap, ExponentialBackoff), SupergraphFetcherError> {
    if !endpoint.ends_with("/supergraph") {
        if endpoint.ends_with("/") {
            endpoint.push_str("supergraph");
        } else {
            endpoint.push_str("/supergraph");
        }
    }

    let mut headers = HeaderMap::new();
    let mut cdn_key_header =
        HeaderValue::from_str(key).map_err(SupergraphFetcherError::InvalidKey)?;
    cdn_key_header.set_sensitive(true);
    headers.insert("X-Hive-CDN-Key", cdn_key_header);

    let retry_policy = ExponentialBackoff::builder().build_with_max_retries(retry_count);

    Ok((endpoint, headers, retry_policy))
}

impl SupergraphFetcher<SupergraphFetcherSyncState> {
    #[allow(clippy::too_many_arguments)]
    pub fn try_new_sync(
        endpoint: String,
        key: &str,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        retry_count: u32,
    ) -> Result<Self, SupergraphFetcherError> {
        let (endpoint, headers, retry_policy) = prepare_client_config(endpoint, key, retry_count)?;

        Ok(Self {
            client: SupergraphFetcherAsyncOrSyncClient::Sync {
                reqwest_client: reqwest::blocking::Client::builder()
                    .danger_accept_invalid_certs(accept_invalid_certs)
                    .connect_timeout(connect_timeout)
                    .timeout(request_timeout)
                    .user_agent(user_agent)
                    .default_headers(headers)
                    .build()
                    .map_err(SupergraphFetcherError::FetcherCreationError)?,
                retry_policy,
            },
            endpoint,
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        })
    }

    pub fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let request_start_time = SystemTime::now();
        // Implementing retry logic for sync client
        let mut n_past_retries = 0;
        let (reqwest_client, retry_policy) = match &self.client {
            SupergraphFetcherAsyncOrSyncClient::Sync {
                reqwest_client,
                retry_policy,
            } => (reqwest_client, retry_policy),
            _ => unreachable!(),
        };
        let resp = loop {
            let mut req = reqwest_client.get(&self.endpoint);
            let etag = self.get_latest_etag()?;
            if let Some(etag) = etag {
                req = req.header(IF_NONE_MATCH, etag);
            }
            let response = req.send();

            match response {
                Ok(resp) => break resp,
                Err(e) => match retry_policy.should_retry(request_start_time, n_past_retries) {
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
                },
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

impl SupergraphFetcher<SupergraphFetcherAsyncState> {
    #[allow(clippy::too_many_arguments)]
    pub fn try_new_async(
        endpoint: String,
        key: &str,
        user_agent: String,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        retry_count: u32,
    ) -> Result<Self, SupergraphFetcherError> {
        let (endpoint, headers, retry_policy) = prepare_client_config(endpoint, key, retry_count)?;

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
            client: SupergraphFetcherAsyncOrSyncClient::Async { reqwest_client },
            endpoint,
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        })
    }
    pub async fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let reqwest_client = match &self.client {
            SupergraphFetcherAsyncOrSyncClient::Async { reqwest_client } => reqwest_client,
            _ => unreachable!(),
        };
        let mut req = reqwest_client.get(&self.endpoint);
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
