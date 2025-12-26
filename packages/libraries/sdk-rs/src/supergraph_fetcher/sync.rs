use std::time::SystemTime;

use recloser::Recloser;
use reqwest::header::{HeaderValue, IF_NONE_MATCH};
use reqwest_retry::{RetryDecision, RetryPolicy};
use retry_policies::policies::ExponentialBackoff;
use tokio::sync::RwLock;

use crate::supergraph_fetcher::{
    builder::SupergraphFetcherBuilder, SupergraphFetcher, SupergraphFetcherError,
};

#[derive(Debug)]
pub struct SupergraphFetcherSyncState {
    endpoints_with_circuit_breakers: Vec<(String, Recloser)>,
    reqwest_client: reqwest::blocking::Client,
    retry_policy: ExponentialBackoff,
}

impl SupergraphFetcher<SupergraphFetcherSyncState> {
    pub fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let mut last_error: Option<SupergraphFetcherError> = None;
        let mut last_resp = None;
        for (endpoint, circuit_breaker) in &self.state.endpoints_with_circuit_breakers {
            let resp = {
                circuit_breaker
                    .call(|| {
                        let request_start_time = SystemTime::now();
                        // Implementing retry logic for sync client
                        let mut n_past_retries = 0;
                        loop {
                            let mut req = self.state.reqwest_client.get(endpoint);
                            let etag = self.get_latest_etag()?;
                            if let Some(etag) = etag {
                                req = req.header(IF_NONE_MATCH, etag);
                            }
                            let mut response = req.send().map_err(|err| {
                                SupergraphFetcherError::NetworkError(
                                    reqwest_middleware::Error::Reqwest(err),
                                )
                            });

                            // Server errors (5xx) are considered retryable
                            if let Ok(ok_res) = response {
                                response = if ok_res.status().is_server_error() {
                                    Err(SupergraphFetcherError::NetworkError(
                                        reqwest_middleware::Error::Middleware(anyhow::anyhow!(
                                            "Server error: {}",
                                            ok_res.status()
                                        )),
                                    ))
                                } else {
                                    Ok(ok_res)
                                }
                            }

                            match response {
                                Ok(resp) => break Ok(resp),
                                Err(e) => {
                                    match self
                                        .state
                                        .retry_policy
                                        .should_retry(request_start_time, n_past_retries)
                                    {
                                        RetryDecision::DoNotRetry => {
                                            return Err(e);
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
                    // Map recloser errors to SupergraphFetcherError
                    .map_err(|e| match e {
                        recloser::Error::Inner(e) => e,
                        recloser::Error::Rejected => {
                            SupergraphFetcherError::RejectedByCircuitBreaker
                        }
                    })
            };
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
    fn get_latest_etag(&self) -> Result<Option<HeaderValue>, SupergraphFetcherError> {
        let guard = self.etag.try_read().map_err(|e| {
            SupergraphFetcherError::Lock(format!("Failed to read the etag record: {:?}", e))
        })?;

        Ok(guard.clone())
    }
    fn update_latest_etag(&self, etag: Option<&HeaderValue>) -> Result<(), SupergraphFetcherError> {
        let mut guard = self.etag.try_write().map_err(|e| {
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

impl SupergraphFetcherBuilder {
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
        let fetcher = SupergraphFetcher {
            state: SupergraphFetcherSyncState {
                reqwest_client,
                retry_policy: self.retry_policy,
                endpoints_with_circuit_breakers: self
                    .endpoints
                    .into_iter()
                    .map(|endpoint| {
                        let circuit_breaker = self
                            .circuit_breaker
                            .clone()
                            .unwrap_or_default()
                            .build_sync()
                            .map_err(SupergraphFetcherError::CircuitBreakerCreationError);
                        circuit_breaker.map(|cb| (endpoint, cb))
                    })
                    .collect::<Result<Vec<_>, _>>()?,
            },
            etag: RwLock::new(None),
        };
        Ok(fetcher)
    }
}
