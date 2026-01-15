use futures_util::TryFutureExt;
use recloser::AsyncRecloser;
use reqwest::header::{HeaderValue, IF_NONE_MATCH};
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::RetryTransientMiddleware;
use tokio::sync::RwLock;

use crate::supergraph_fetcher::{
    builder::SupergraphFetcherBuilder, SupergraphFetcher, SupergraphFetcherError,
};

#[derive(Debug)]
pub struct SupergraphFetcherAsyncState {
    endpoints_with_circuit_breakers: Vec<(String, AsyncRecloser)>,
    reqwest_client: ClientWithMiddleware,
}

impl SupergraphFetcher<SupergraphFetcherAsyncState> {
    pub async fn fetch_supergraph(&self) -> Result<Option<String>, SupergraphFetcherError> {
        let mut last_error: Option<SupergraphFetcherError> = None;
        let mut last_resp = None;
        for (endpoint, circuit_breaker) in &self.state.endpoints_with_circuit_breakers {
            let mut req = self.state.reqwest_client.get(endpoint);
            let etag = self.get_latest_etag().await;
            if let Some(etag) = etag {
                req = req.header(IF_NONE_MATCH, etag);
            }
            let resp_fut = async {
                let mut resp = req.send().await.map_err(SupergraphFetcherError::Network);
                // Server errors (5xx) are considered errors
                if let Ok(ok_res) = resp {
                    resp = if ok_res.status().is_server_error() {
                        return Err(SupergraphFetcherError::Network(
                            reqwest_middleware::Error::Middleware(anyhow::anyhow!(
                                "Server error: {}",
                                ok_res.status()
                            )),
                        ));
                    } else {
                        Ok(ok_res)
                    }
                }
                resp
            };
            let resp = circuit_breaker
                .call(resp_fut)
                // Map recloser errors to SupergraphFetcherError
                .map_err(|e| match e {
                    recloser::Error::Inner(e) => e,
                    recloser::Error::Rejected => SupergraphFetcherError::RejectedByCircuitBreaker,
                })
                .await;
            match resp {
                Err(err) => {
                    last_error = Some(err);
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
            self.update_latest_etag(etag).await;
            let text = last_resp
                .text()
                .await
                .map_err(SupergraphFetcherError::ResponseParse)?;
            Ok(Some(text))
        } else if let Some(error) = last_error {
            Err(error)
        } else {
            Ok(None)
        }
    }
    async fn get_latest_etag(&self) -> Option<HeaderValue> {
        let guard = self.etag.read().await;

        guard.clone()
    }
    async fn update_latest_etag(&self, etag: Option<&HeaderValue>) -> () {
        let mut guard = self.etag.write().await;

        if let Some(etag_value) = etag {
            *guard = Some(etag_value.clone());
        } else {
            *guard = None;
        }
    }
}

impl SupergraphFetcherBuilder {
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
            .map_err(SupergraphFetcherError::HTTPClientCreation)?;
        let reqwest_client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(self.retry_policy))
            .build();

        Ok(SupergraphFetcher {
            state: SupergraphFetcherAsyncState {
                reqwest_client,
                endpoints_with_circuit_breakers: self
                    .endpoints
                    .into_iter()
                    .map(|endpoint| {
                        let circuit_breaker = self
                            .circuit_breaker
                            .clone()
                            .unwrap_or_default()
                            .build_async()
                            .map_err(SupergraphFetcherError::CircuitBreakerCreation);
                        circuit_breaker.map(|cb| (endpoint, cb))
                    })
                    .collect::<Result<Vec<_>, _>>()?,
            },
            etag: RwLock::new(None),
        })
    }
}
