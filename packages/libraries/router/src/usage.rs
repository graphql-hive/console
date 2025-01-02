use crate::agent::{AgentError, ExecutionReport, UsageAgent};
use crate::persisted_documents::PERSISTED_DOCUMENT_HASH_KEY;
use apollo_router::layers::ServiceBuilderExt;
use apollo_router::plugin::Plugin;
use apollo_router::plugin::PluginInit;
use apollo_router::services::*;
use apollo_router::Context;
use core::ops::Drop;
use futures::StreamExt;
use http::HeaderValue;
use rand::Rng;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::BoxError;
use tower::ServiceBuilder;
use tower::ServiceExt;

pub(crate) static OPERATION_CONTEXT: &str = "hive::operation_context";

#[derive(Serialize, Deserialize, Debug)]
struct OperationContext {
    pub(crate) client_name: Option<String>,
    pub(crate) client_version: Option<String>,
    pub(crate) timestamp: u64,
    pub(crate) operation_body: String,
    pub(crate) operation_name: Option<String>,
    pub(crate) dropped: bool,
}

#[derive(Clone, Debug)]
struct OperationConfig {
    sample_rate: f64,
    exclude: Option<Vec<String>>,
    client_name_header: String,
    client_version_header: String,
}

pub struct UsagePlugin {
    config: OperationConfig,
    agent: Option<Arc<Mutex<UsageAgent>>>,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
pub struct Config {
    /// Default: true
    enabled: Option<bool>,
    /// Hive token, can also be set using the HIVE_TOKEN environment variable
    registry_token: Option<String>,
    /// Hive registry token. Set to your `/usage` endpoint if you are self-hosting.
    /// Default: https://app.graphql-hive.com/usage
    registry_usage_endpoint: Option<String>,
    /// Sample rate to determine sampling.
    /// 0.0 = 0% chance of being sent
    /// 1.0 = 100% chance of being sent.
    /// Default: 1.0
    sample_rate: Option<f64>,
    /// A list of operations (by name) to be ignored by GraphQL Hive.
    exclude: Option<Vec<String>>,
    client_name_header: Option<String>,
    client_version_header: Option<String>,
    /// A maximum number of operations to hold in a buffer before sending to GraphQL Hive
    /// Default: 1000
    buffer_size: Option<usize>,
    /// A timeout for only the connect phase of a request to GraphQL Hive
    /// Unit: seconds
    /// Default: 5 (s)
    connect_timeout: Option<u64>,
    /// A timeout for the entire request to GraphQL Hive
    /// Unit: seconds
    /// Default: 15 (s)
    request_timeout: Option<u64>,
    /// Accept invalid SSL certificates
    /// Default: false
    accept_invalid_certs: Option<bool>,
    /// Frequency of flushing the buffer to the server
    /// Default: 5 seconds
    flush_interval: Option<u64>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: Some(true),
            registry_token: None,
            registry_usage_endpoint: Some(DEFAULT_HIVE_USAGE_ENDPOINT.into()),
            sample_rate: Some(1.0),
            exclude: None,
            client_name_header: Some(String::from("graphql-client-name")),
            client_version_header: Some(String::from("graphql-client-version")),
            accept_invalid_certs: Some(false),
            buffer_size: Some(1000),
            connect_timeout: Some(5),
            request_timeout: Some(15),
            flush_interval: Some(5),
        }
    }
}

impl UsagePlugin {
    fn populate_context(config: OperationConfig, req: &supergraph::Request) {
        let context = &req.context;
        let http_request = &req.supergraph_request;
        let headers = http_request.headers();

        let get_header_value = |key: &str| {
            headers
                .get(key)
                .cloned()
                .unwrap_or_else(|| HeaderValue::from_static(""))
                .to_str()
                .ok()
                .map(|v| v.to_string())
        };

        let client_name = get_header_value(&config.client_name_header);
        let client_version = get_header_value(&config.client_version_header);

        let operation_name = req.supergraph_request.body().operation_name.clone();
        let operation_body = req
            .supergraph_request
            .body()
            .query
            .clone()
            .expect("operation body should not be empty");

        let excluded_operation_names: HashSet<String> = config
            .exclude
            .unwrap_or_else(|| vec![])
            .clone()
            .into_iter()
            .collect();

        let mut rng = rand::thread_rng();
        let sampled = rng.gen::<f64>() < config.sample_rate;
        let mut dropped = !sampled;

        if !dropped {
            match &operation_name {
                Some(name) => {
                    if excluded_operation_names.contains(name) {
                        dropped = true;
                    }
                }
                None => {}
            }
        }

        let _ = context.insert(
            OPERATION_CONTEXT,
            OperationContext {
                dropped,
                client_name,
                client_version,
                operation_name,
                operation_body,
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    * 1000,
            },
        );
    }
}

static DEFAULT_HIVE_USAGE_ENDPOINT: &str = "https://app.graphql-hive.com/usage";

#[async_trait::async_trait]
impl Plugin for UsagePlugin {
    type Config = Config;

    async fn new(init: PluginInit<Config>) -> Result<Self, BoxError> {
        let token = init
            .config
            .registry_token
            .clone()
            .or_else(|| env::var("HIVE_TOKEN").ok());

        if let None = token {
            return Err("Hive token is required".into());
        }

        let endpoint = init
            .config
            .registry_usage_endpoint
            .clone()
            .unwrap_or_else(|| {
                env::var("HIVE_ENDPOINT").unwrap_or(DEFAULT_HIVE_USAGE_ENDPOINT.to_string())
            });

        let default_config = Config::default();
        let user_config = init.config;
        let enabled = user_config
            .enabled
            .or(default_config.enabled)
            .expect("enabled has default value");
        let buffer_size = user_config
            .buffer_size
            .or(default_config.buffer_size)
            .expect("buffer_size has no default value");
        let accept_invalid_certs = user_config
            .accept_invalid_certs
            .or(default_config.accept_invalid_certs)
            .expect("accept_invalid_certs has no default value");
        let connect_timeout = user_config
            .connect_timeout
            .or(default_config.connect_timeout)
            .expect("connect_timeout has no default value");
        let request_timeout = user_config
            .request_timeout
            .or(default_config.request_timeout)
            .expect("request_timeout has no default value");
        let flush_interval = user_config
            .flush_interval
            .or(default_config.flush_interval)
            .expect("request_timeout has no default value");

        if enabled {
            tracing::info!("Starting GraphQL Hive Usage plugin");
        }

        Ok(UsagePlugin {
            config: OperationConfig {
                sample_rate: user_config
                    .sample_rate
                    .or(default_config.sample_rate)
                    .expect("sample_rate has no default value"),
                exclude: user_config.exclude.or(default_config.exclude),
                client_name_header: user_config
                    .client_name_header
                    .or(default_config.client_name_header)
                    .expect("client_name_header has no default value"),
                client_version_header: user_config
                    .client_version_header
                    .or(default_config.client_version_header)
                    .expect("client_version_header has no default value"),
            },
            agent: match enabled {
                true => Some(Arc::new(Mutex::new(UsageAgent::new(
                    init.supergraph_sdl.to_string(),
                    token.unwrap(),
                    endpoint,
                    buffer_size,
                    connect_timeout,
                    request_timeout,
                    accept_invalid_certs,
                    Duration::from_secs(flush_interval),
                )))),
                false => None,
            },
        })
    }

    fn supergraph_service(&self, service: supergraph::BoxService) -> supergraph::BoxService {
        let config = self.config.clone();
        match self.agent.clone() {
            None => ServiceBuilder::new().service(service).boxed(),
            Some(agent) => {
                ServiceBuilder::new()
                    .map_future_with_request_data(
                        move |req: &supergraph::Request| {
                            Self::populate_context(config.clone(), req);
                            req.context.clone()
                        },
                        move |ctx: Context, fut| {
                            let agent_clone = agent.clone();
                            async move {
                                let start: Instant = Instant::now();

                                // nested async block, bc async is unstable with closures that receive arguments
                                let operation_context = ctx
                                    .get::<_, OperationContext>(OPERATION_CONTEXT)
                                    .unwrap_or_default()
                                    .unwrap();

                                // Injected by the persisted document plugin, if it was activated
                                // and discovered document id
                                let persisted_document_hash = ctx
                                    .get::<_, String>(PERSISTED_DOCUMENT_HASH_KEY)
                                    .ok()
                                    .unwrap();

                                let result: supergraph::ServiceResult = fut.await;

                                if operation_context.dropped {
                                    tracing::debug!(
                                        "Dropping operation (phase: SAMPLING): {}",
                                        operation_context
                                            .operation_name
                                            .clone()
                                            .or_else(|| Some("anonymous".to_string()))
                                            .unwrap()
                                    );
                                    return result;
                                }

                                let OperationContext {
                                    client_name,
                                    client_version,
                                    operation_name,
                                    timestamp,
                                    operation_body,
                                    ..
                                } = operation_context;

                                let duration = start.elapsed();

                                match result {
                                    Err(e) => {
                                        try_add_report(
                                            agent_clone.clone(),
                                            ExecutionReport {
                                                client_name,
                                                client_version,
                                                timestamp,
                                                duration,
                                                ok: false,
                                                errors: 1,
                                                operation_body,
                                                operation_name,
                                                persisted_document_hash,
                                            },
                                        );
                                        Err(e)
                                    }
                                    Ok(router_response) => {
                                        let is_failure =
                                            !router_response.response.status().is_success();
                                        Ok(router_response.map(move |response_stream| {
                                            let client_name = client_name.clone();
                                            let client_version = client_version.clone();
                                            let operation_body = operation_body.clone();
                                            let operation_name = operation_name.clone();

                                            let res = response_stream
                                                .map(move |response| {
                                                    // make sure we send a single report, not for each chunk
                                                    let response_has_errors =
                                                        !response.errors.is_empty();
                                                    try_add_report(
                                                        agent_clone.clone(),
                                                        ExecutionReport {
                                                            client_name: client_name.clone(),
                                                            client_version: client_version.clone(),
                                                            timestamp,
                                                            duration,
                                                            ok: !is_failure && !response_has_errors,
                                                            errors: response.errors.len(),
                                                            operation_body: operation_body.clone(),
                                                            operation_name: operation_name.clone(),
                                                            persisted_document_hash:
                                                                persisted_document_hash.clone(),
                                                        },
                                                    );

                                                    response
                                                })
                                                .boxed();

                                            res
                                        }))
                                    }
                                }
                            }
                        },
                    )
                    .service(service)
                    .boxed()
            }
        }
    }
}

fn try_add_report(agent: Arc<Mutex<UsageAgent>>, execution_report: ExecutionReport) {
    agent
        .lock()
        .map_err(|e| AgentError::Lock(e.to_string()))
        .and_then(|a| a.add_report(execution_report))
        .unwrap_or_else(|e| {
            tracing::error!("Error adding report: {}", e);
        });
}

impl Drop for UsagePlugin {
    fn drop(&mut self) {
        tracing::debug!("UsagePlugin has been dropped!");
        // TODO: flush the buffer
    }
}

#[cfg(test)]
mod hive_usage_tests {
    use apollo_router::{
        plugin::{test::MockSupergraphService, Plugin, PluginInit},
        services::supergraph,
    };
    use httpmock::{Method::POST, Mock, MockServer};
    use jsonschema::Validator;
    use serde_json::json;
    use tower::ServiceExt;

    use super::{Config, UsagePlugin};

    lazy_static::lazy_static! {
        static ref SCHEMA_VALIDATOR: Validator =
                jsonschema::validator_for(&serde_json::from_str(&std::fs::read_to_string("../../services/usage/usage-report-v2.schema.json").expect("can't load json schema file")).expect("failed to parse json schema")).expect("failed to parse schema");
    }

    struct UsageTestHelper {
        mocked_upstream: MockServer,
        plugin: UsagePlugin,
    }

    impl UsageTestHelper {
        async fn new() -> Self {
            let server: MockServer = MockServer::start();
            let usage_endpoint = server.url("/usage");
            let mut config = Config::default();
            config.enabled = Some(true);
            config.registry_usage_endpoint = Some(usage_endpoint.to_string());
            config.registry_token = Some("123".into());
            config.buffer_size = Some(1);
            config.flush_interval = Some(1);

            let plugin_service = UsagePlugin::new(
                PluginInit::fake_builder()
                    .config(config)
                    .supergraph_sdl("type Query { dummy: String! }".to_string().into())
                    .build(),
            )
            .await
            .expect("failed to init plugin");

            UsageTestHelper {
                mocked_upstream: server,
                plugin: plugin_service,
            }
        }

        fn wait_for_processing(&self) -> tokio::time::Sleep {
            tokio::time::sleep(tokio::time::Duration::from_secs(1))
        }

        fn activate_usage_mock(&self) -> Mock {
            self.mocked_upstream.mock(|when, then| {
                when.method(POST).path("/usage").matches(|r| {
                    // This mock also validates that the content of the reported usage is valid
                    // when it comes to the JSON schema validation.
                    // if it does not match, the request matching will fail and this will lead
                    // to a failed assertion
                    let body = r.body.as_ref().unwrap();
                    let body = String::from_utf8(body.to_vec()).unwrap();
                    let body = serde_json::from_str(&body).unwrap();

                    SCHEMA_VALIDATOR.is_valid(&body)
                });
                then.status(200);
            })
        }

        async fn execute_operation(&self, req: supergraph::Request) -> supergraph::Response {
            let mut supergraph_service_mock = MockSupergraphService::new();

            supergraph_service_mock
                .expect_call()
                .times(1)
                .returning(move |_| {
                    Ok(supergraph::Response::fake_builder()
                        .data(json!({
                            "data": { "hello": "world" },
                        }))
                        .build()
                        .unwrap())
                });

            let tower_service = self
                .plugin
                .supergraph_service(supergraph_service_mock.boxed());

            let response = tower_service
                .oneshot(req)
                .await
                .expect("failed to execute operation");

            response
        }
    }

    #[tokio::test]
    async fn should_work_correctly_for_simple_query() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query test { hello }")
            .operation_name("test")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }

    #[tokio::test]
    async fn without_operation_name() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query { hello }")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }

    #[tokio::test]
    async fn multiple_operations() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query test { hello } query test2 { hello }")
            .operation_name("test")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }

    #[tokio::test]
    async fn invalid_query_reported() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query {")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }
}
