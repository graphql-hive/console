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
use reqwest_retry::RetryDecision;
use reqwest_retry::RetryPolicy;
use reqwest_retry::RetryTransientMiddleware;
use retry_policies::policies::ExponentialBackoff;

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
    Lock(String),
    InvalidKey(InvalidHeaderValue),
    MissingConfigurationOption(String),
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
        }
    }
}

fn prepare_client_config(
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
    let mut cdn_key_header =
        HeaderValue::from_str(key).map_err(SupergraphFetcherError::InvalidKey)?;
    cdn_key_header.set_sensitive(true);
    headers.insert("X-Hive-CDN-Key", cdn_key_header);

    Ok((endpoint, headers))
}

impl SupergraphFetcher<SupergraphFetcherSyncState> {
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
    endpoint: Option<String>,
    key: Option<String>,
    user_agent: Option<String>,
    connect_timeout: Duration,
    request_timeout: Duration,
    accept_invalid_certs: bool,
    retry_policy: ExponentialBackoff,
}

impl Default for SupergraphFetcherBuilder {
    fn default() -> Self {
        Self {
            endpoint: None,
            key: None,
            user_agent: None,
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(60),
            accept_invalid_certs: false,
            retry_policy: ExponentialBackoff::builder().build_with_max_retries(3),
        }
    }
}

impl SupergraphFetcherBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    /// The CDN endpoint from Hive Console target.
    pub fn endpoint(mut self, endpoint: String) -> Self {
        self.endpoint = Some(endpoint);
        self
    }

    /// The CDN Access Token with from the Hive Console target.
    pub fn key(mut self, key: String) -> Self {
        self.key = Some(key);
        self
    }

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

    /// Builds a synchronous SupergraphFetcher
    pub fn build_sync(
        self,
    ) -> Result<SupergraphFetcher<SupergraphFetcherSyncState>, SupergraphFetcherError> {
        let endpoint = match self.endpoint {
            Some(endpoint) => endpoint,
            None => {
                return Err(SupergraphFetcherError::MissingConfigurationOption(
                    "endpoint".to_string(),
                ))
            }
        };
        let key = match self.key {
            Some(key) => key,
            None => {
                return Err(SupergraphFetcherError::MissingConfigurationOption(
                    "key".to_string(),
                ))
            }
        };
        let (endpoint, headers) = prepare_client_config(endpoint, &key)?;

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
            },
            endpoint,
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        };
        Ok(fetcher)
    }

    /// Builds an asynchronous SupergraphFetcher
    pub fn build_async(
        self,
    ) -> Result<SupergraphFetcher<SupergraphFetcherAsyncState>, SupergraphFetcherError> {
        let endpoint = match self.endpoint {
            Some(endpoint) => endpoint,
            None => {
                return Err(SupergraphFetcherError::MissingConfigurationOption(
                    "endpoint".to_string(),
                ))
            }
        };
        let key = match self.key {
            Some(key) => key,
            None => {
                return Err(SupergraphFetcherError::MissingConfigurationOption(
                    "key".to_string(),
                ))
            }
        };

        let (endpoint, headers) = prepare_client_config(endpoint, &key)?;

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
            client: SupergraphFetcherAsyncOrSyncClient::Async { reqwest_client },
            endpoint,
            etag: RwLock::new(None),
            state: std::marker::PhantomData,
        })
    }
}
